using System.Text;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace HotelMan_HotelAdmin;

public class HotelAdmin
{
    public APIGatewayProxyResponse AddHotel(APIGatewayProxyRequest request, ILambdaContext context)
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

        var bodyContent = request.IsBase64Enncoded ? Convert.FromBase64String(request.Body) : Encoding.UTF8.GetBytes(request.Body);

        using var memoryStream = new MemoryStream(bodyContent);
        var formData = MultipartFormDataParser.Parse(memoryStream);

        var hotelName = formData.GetParameterValue("hotelName");

        return response;
    }
}
