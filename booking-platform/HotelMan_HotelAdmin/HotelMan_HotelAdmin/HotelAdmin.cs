using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Text;
using System.Text.Json;
using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using Amazon.S3;
using HotelMan_HotelAdmin.Models;
using HttpMultipartParser;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace HotelMan_HotelAdmin;

public class HotelAdmin
{
    public async Task<APIGatewayProxyResponse> ListHotels(APIGatewayProxyRequest request, ILambdaContext context)
    {
        var response = new APIGatewayProxyResponse
        {
            Headers = new Dictionary<string, string>
            {
                // { "Content-Type", "application/json" },
                { "Access-Control-Allow-Origin", "http://localhost:8080" },
                { "Access-Control-Allow-Headers", "Content-Type,Authorization" },
                { "Access-Control-Allow-Methods", "POST,OPTIONS" },
                { "Content-Type", "application/json" }
            },
            StatusCode = 200,
        };

        var token = request.QueryStringParameters["token"];
        var tokenDetails = new JwtSecurityToken(token);
        var userId = tokenDetails.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;

        var region = Environment.GetEnvironmentVariable("AWS_REGION");
        var dbClient = new AmazonDynamoDBClient(RegionEndpoint.GetBySystemName(region));
        using var dbContext = new DynamoDBContextBuilder()
            .WithDynamoDBClient(() => dbClient)
            .Build();

        var hotels = await dbContext.ScanAsync<Hotel>(new List<ScanCondition> { new ScanCondition("UserId", ScanOperator.Equal, userId) }).GetRemainingAsync(); 

        var bucketName = Environment.GetEnvironmentVariable("bucketName");
        var s3Client = new AmazonS3Client(RegionEndpoint.GetBySystemName(region));
        foreach (var hotel in hotels.Where(h => !string.IsNullOrEmpty(h.FileName)))
        {
            hotel.ImageUrl = s3Client.GetPreSignedURL(new Amazon.S3.Model.GetPreSignedUrlRequest
            {
                BucketName = bucketName,
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
        Console.WriteLine("Ok.");

        // Implementation for adding a hotel
        var response = new APIGatewayProxyResponse
        {
            Headers = new Dictionary<string, string>
            {
                // { "Content-Type", "application/json" },
                { "Access-Control-Allow-Origin", "http://localhost:8080" },
                { "Access-Control-Allow-Headers", "Content-Type,Authorization" },
                { "Access-Control-Allow-Methods", "POST,OPTIONS" }
            },
            StatusCode = 200,
            Body = "Hotel added successfully"
        };

        var bodyContent = request.IsBase64Encoded ? Convert.FromBase64String(request.Body) : Encoding.UTF8.GetBytes(request.Body);

        using var memoryStream = new MemoryStream(bodyContent);
        var formData = MultipartFormDataParser.Parse(memoryStream);

        var hotelName = formData.GetParameterValue("hotelName");
        var hotelRatingText = formData.GetParameterValue("hotelRating");
        var hotelCity = formData.GetParameterValue("hotelCity");
        var hotelCountry = formData.GetParameterValue("hotelCountry");
        var hotelPriceText = formData.GetParameterValue("hotelPrice");
        var hotelDescription = formData.GetParameterValue("hotelDescription");

        var file = formData.Files.FirstOrDefault();

        var userId = formData.GetParameterValue("userId");
        var idToken = formData.GetParameterValue("idToken");

        var token = new JwtSecurityToken(idToken);
        var group = token.Claims.FirstOrDefault(c => c.Type == "cognito:groups");
        if (group == null || group.Value != "Admin")
        {
            response.StatusCode = (int)HttpStatusCode.Unauthorized;
            response.Body = JsonSerializer.Serialize(new { Error = "Unauthorized: User is not an admin" });
            return response;
        }

        if (file == null)
        {
            response.StatusCode = (int)HttpStatusCode.BadRequest;
            response.Body = JsonSerializer.Serialize(new { Error = "Hotel image file is required" });
            return response;
        }

        var fileName = file.FileName;

        await using var fileContentStream = new MemoryStream();
        await file.Data.CopyToAsync(fileContentStream);
        fileContentStream.Position = 0;

        context.Logger.LogInformation(
            $"Hotel: {hotelName}, {hotelCity}, {hotelCountry}, rating {hotelRatingText}, price {hotelPriceText}, description: {hotelDescription}");

        var region = Environment.GetEnvironmentVariable("AWS_REGION");
        var bucketName = Environment.GetEnvironmentVariable("bucketName");

        var client = new AmazonS3Client(RegionEndpoint.GetBySystemName(region));
        var dbClient = new AmazonDynamoDBClient(RegionEndpoint.GetBySystemName(region));
        
        try
        {
            await client.PutObjectAsync(new Amazon.S3.Model.PutObjectRequest
            {
                BucketName = bucketName,
                Key = fileName,
                InputStream = fileContentStream,
                ContentType = file.ContentType,
                AutoCloseStream = true
            });

            var hotel = new Hotel
            {
                UserId = userId,
                Id = Guid.NewGuid().ToString(),
                Name = hotelName,
                City = hotelCity,
                Country = hotelCountry,
                Description = hotelDescription,
                Rating = int.Parse(hotelRatingText, CultureInfo.InvariantCulture),
                Price = decimal.Parse(hotelPriceText, CultureInfo.InvariantCulture),
                FileName = fileName
            };

            using var dbContext = new DynamoDBContextBuilder()
                .WithDynamoDBClient(() => dbClient)
                .Build();
            await dbContext.SaveAsync(hotel);
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"Error uploading file to S3: {ex.Message}");
            response.StatusCode = (int)HttpStatusCode.InternalServerError;
            response.Body = JsonSerializer.Serialize(new { Error = "Error uploading file to S3" });
            return response;
        }
        
        return response;
    }
}
