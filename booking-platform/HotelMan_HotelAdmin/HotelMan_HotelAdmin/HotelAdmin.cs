using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Text;
using System.Text.Json;
using Amazon;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using Amazon.S3;
using HttpMultipartParser;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace HotelMan_HotelAdmin;

public class HotelAdmin
{
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
        var fileName = file?.FileName;

        await using var fileContentStream = new MemoryStream();
        await file.Data.CopyToAsync(fileContentStream);
        fileContentStream.Position = 0;

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

        context.Logger.LogInformation(
            $"Hotel: {hotelName}, {hotelCity}, {hotelCountry}, rating {hotelRatingText}, price {hotelPriceText}, description: {hotelDescription}");

        var region = Environment.GetEnvironmentVariable("AWS_REGION");
        var bucketName = Environment.GetEnvironmentVariable("bucketName");

        var client = new AmazonS3Client(RegionEndpoint.GetBySystemName(region));
        
        await client.PutObjectAsync(new Amazon.S3.Model.PutObjectRequest
        {
            BucketName = bucketName,
            Key = fileName,
            InputStream = fileContentStream,
            AutoCloseStream = true
        });


        return response;
    }
}
