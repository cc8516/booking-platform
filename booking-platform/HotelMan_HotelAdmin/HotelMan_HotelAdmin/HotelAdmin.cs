using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Text;
using System.Text.Json;
using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using Amazon.S3;
using HotelMan_HotelAdmin.Models;
using HttpMultipartParser;
using Microsoft.IdentityModel.Tokens;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace HotelMan_HotelAdmin;

public class HotelAdmin
{
    private const long MaxImageBytes = 5 * 1024 * 1024;
    private static readonly string[] AllowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

    // Clients are thread-safe and expensive to build: create once per Lambda container, not per request.
    private static readonly RegionEndpoint Region =
        RegionEndpoint.GetBySystemName(Environment.GetEnvironmentVariable("AWS_REGION"));
    private static readonly AmazonS3Client S3 = new(Region);
    private static readonly AmazonDynamoDBClient Dynamo = new(Region);
    private static readonly DynamoDBContext Db = new DynamoDBContextBuilder().WithDynamoDBClient(() => Dynamo).Build();
    private static readonly string? BucketName = Environment.GetEnvironmentVariable("bucketName");

    // Defaults to the local dev server; set the "allowedOrigin" env var on the Lambda for other environments.
    private static readonly string AllowedOrigin =
        Environment.GetEnvironmentVariable("allowedOrigin") ?? "http://localhost:8080";

    public async Task<APIGatewayProxyResponse> ListHotels(APIGatewayProxyRequest request, ILambdaContext context)
    {
        var response = NewResponse("GET,OPTIONS", jsonBody: true);

        var token = request.QueryStringParameters is not null && request.QueryStringParameters.TryGetValue("token", out var t) ? t : null;
        var userId = await GetVerifiedClaims(token, context) is { } claims ? claims.FindFirst("sub")?.Value : null;
        if (string.IsNullOrEmpty(userId))
        {
            return Error(response, HttpStatusCode.Unauthorized, "Unauthorized: missing or invalid token");
        }

        // userId is the table's partition key, so this is a Query (reads only this user's items), not a table Scan.
        var hotels = await Db.QueryAsync<Hotel>(userId).GetRemainingAsync();

        foreach (var hotel in hotels.Where(h => !string.IsNullOrEmpty(h.FileName)))
        {
            hotel.ImageUrl = S3.GetPreSignedURL(new Amazon.S3.Model.GetPreSignedUrlRequest
            {
                BucketName = BucketName,
                Key = hotel.FileName,
                Verb = HttpVerb.GET,
                Expires = DateTime.UtcNow.AddHours(1)
            });
        }

        response.Body = JsonSerializer.Serialize(hotels);
        return response;
    }

    public async Task<APIGatewayProxyResponse> AddHotel(APIGatewayProxyRequest request, ILambdaContext context)
    {
        var response = NewResponse("POST,OPTIONS", jsonBody: false);
        response.Body = "Hotel added successfully";

        if (string.IsNullOrEmpty(request.Body))
        {
            return Error(response, HttpStatusCode.BadRequest, "Request body is required");
        }

        MultipartFormDataParser formData;
        try
        {
            var bodyContent = request.IsBase64Encoded ? Convert.FromBase64String(request.Body) : Encoding.UTF8.GetBytes(request.Body);
            using var memoryStream = new MemoryStream(bodyContent);
            formData = await MultipartFormDataParser.ParseAsync(memoryStream);
        }
        catch (Exception ex) when (ex is FormatException or MultipartParseException)
        {
            return Error(response, HttpStatusCode.BadRequest, "Malformed multipart request");
        }

        // Identity and role come from the token, never from client-supplied form fields.
        var claims = await GetVerifiedClaims(formData.GetParameterValue("idToken"), context);
        var userId = claims?.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Error(response, HttpStatusCode.Unauthorized, "Unauthorized: missing or invalid token");
        }

        // A user in several groups has one "cognito:groups" claim per group, so check them all.
        if (!claims!.Claims.Any(c => c.Type == "cognito:groups" && c.Value == "Admin"))
        {
            return Error(response, HttpStatusCode.Unauthorized, "Unauthorized: User is not an admin");
        }

        var file = formData.Files.Count > 0 ? formData.Files[0] : null;
        if (file == null)
        {
            return Error(response, HttpStatusCode.BadRequest, "Hotel image file is required");
        }
        if (!AllowedImageTypes.Contains(file.ContentType))
        {
            return Error(response, HttpStatusCode.BadRequest, "Image must be a JPEG, PNG or WebP file");
        }

        var hotelName = formData.GetParameterValue("hotelName");
        var hotelCity = formData.GetParameterValue("hotelCity");
        var hotelCountry = formData.GetParameterValue("hotelCountry");
        var hotelDescription = formData.GetParameterValue("hotelDescription");

        if (string.IsNullOrWhiteSpace(hotelName) || string.IsNullOrWhiteSpace(hotelCity) || string.IsNullOrWhiteSpace(hotelCountry))
        {
            return Error(response, HttpStatusCode.BadRequest, "Name, city and country are required");
        }
        if (!int.TryParse(formData.GetParameterValue("hotelRating"), NumberStyles.Integer, CultureInfo.InvariantCulture, out var rating) || rating is < 0 or > 5)
        {
            return Error(response, HttpStatusCode.BadRequest, "Rating must be a whole number between 0 and 5");
        }
        if (!decimal.TryParse(formData.GetParameterValue("hotelPrice"), NumberStyles.Number, CultureInfo.InvariantCulture, out var price) || price <= 0)
        {
            return Error(response, HttpStatusCode.BadRequest, "Price must be greater than 0");
        }

        await using var fileContentStream = new MemoryStream();
        await file.Data.CopyToAsync(fileContentStream);
        if (fileContentStream.Length > MaxImageBytes)
        {
            return Error(response, HttpStatusCode.BadRequest, "Image must be 5 MB or smaller");
        }
        fileContentStream.Position = 0;

        // Unique key: a client-chosen name must not overwrite another hotel's image or carry path segments.
        var fileName = $"{Guid.NewGuid():N}-{Path.GetFileName(file.FileName)}";

        // Log identifiers only; never tokens or other credentials.
        context.Logger.LogInformation($"Add hotel request from user {userId}: {hotelName}, {hotelCity}, {hotelCountry}");

        var uploaded = false;
        try
        {
            await S3.PutObjectAsync(new Amazon.S3.Model.PutObjectRequest
            {
                BucketName = BucketName,
                Key = fileName,
                InputStream = fileContentStream,
                ContentType = file.ContentType,
                AutoCloseStream = true
            });
            uploaded = true;

            await Db.SaveAsync(new Hotel
            {
                UserId = userId,
                Id = Guid.NewGuid().ToString(),
                Name = hotelName.Trim(),
                City = hotelCity.Trim(),
                Country = hotelCountry.Trim(),
                Description = hotelDescription?.Trim() ?? string.Empty,
                Rating = rating,
                Price = price,
                FileName = fileName
            });
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"Error saving hotel: {ex}");
            if (uploaded)
            {
                // Don't leave an orphaned image behind when the database write failed.
                try { await S3.DeleteObjectAsync(BucketName, fileName); } catch { /* best effort */ }
            }
            return Error(response, HttpStatusCode.InternalServerError, "Error saving hotel");
        }

        return response;
    }

    private static APIGatewayProxyResponse NewResponse(string methods, bool jsonBody)
    {
        var headers = new Dictionary<string, string>
        {
            { "Access-Control-Allow-Origin", AllowedOrigin },
            { "Access-Control-Allow-Headers", "Content-Type,Authorization" },
            { "Access-Control-Allow-Methods", methods }
        };
        if (jsonBody) headers["Content-Type"] = "application/json";
        return new APIGatewayProxyResponse { Headers = headers, StatusCode = 200 };
    }

    private static APIGatewayProxyResponse Error(APIGatewayProxyResponse response, HttpStatusCode status, string message)
    {
        response.StatusCode = (int)status;
        response.Body = JsonSerializer.Serialize(new { Error = message });
        return response;
    }

    // ---- Token handling -------------------------------------------------------------------------------------------
    // If the "cognitoUserPoolId" env var is set (e.g. "us-east-2_i36FtHXmG"), tokens are fully validated against the
    // pool's signing keys (signature, issuer, expiry). If it is not set, tokens are only decoded, NOT verified, so
    // anyone could forge one: set the variable on the deployed Lambda to close that hole.

    private static readonly string? UserPoolId = Environment.GetEnvironmentVariable("cognitoUserPoolId");
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(5) };
    private static IList<SecurityKey>? _signingKeys;

    private static async Task<System.Security.Claims.ClaimsPrincipal?> GetVerifiedClaims(string? token, ILambdaContext context)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;
        var handler = new JwtSecurityTokenHandler();
        if (!handler.CanReadToken(token)) return null;

        if (string.IsNullOrEmpty(UserPoolId))
        {
            context.Logger.LogWarning("cognitoUserPoolId is not set: JWT signature is NOT being verified.");
            var unverified = handler.ReadJwtToken(token);
            return new System.Security.Claims.ClaimsPrincipal(new System.Security.Claims.ClaimsIdentity(unverified.Claims));
        }

        try
        {
            var issuer = $"https://cognito-idp.{UserPoolId.Split('_')[0]}.amazonaws.com/{UserPoolId}";
            _signingKeys ??= new JsonWebKeySet(await Http.GetStringAsync($"{issuer}/.well-known/jwks.json")).GetSigningKeys();
            handler.InboundClaimTypeMap.Clear(); // keep claim names as-is ("sub", "cognito:groups")
            return handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidIssuer = issuer,
                IssuerSigningKeys = _signingKeys,
                ValidateAudience = false, // Cognito id tokens carry the client id as "aud"; access tokens do not
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(1)
            }, out _);
        }
        catch (Exception ex) when (ex is SecurityTokenException or HttpRequestException or TaskCanceledException)
        {
            context.Logger.LogWarning($"Token validation failed: {ex.GetType().Name}");
            return null;
        }
    }
}
