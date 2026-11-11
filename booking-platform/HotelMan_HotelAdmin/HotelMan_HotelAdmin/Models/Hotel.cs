using Amazon.DynamoDBv2.DataModel;

namespace HotelMan_HotelAdmin.Models
{
    [DynamoDBTable("Hotels")]
    public class Hotel
    {
        [DynamoDBHashKey("userId")]
        public string UserId { get; set; } = string.Empty;

        [DynamoDBRangeKey("id")]
        public string Id { get; set; } = string.Empty;

        [DynamoDBProperty("name")]
        public string Name { get; set; } = string.Empty;

        [DynamoDBProperty("city")]
        public string City { get; set; } = string.Empty;

        [DynamoDBProperty("country")]
        public string Country { get; set; } = string.Empty;

        [DynamoDBProperty("description")]
        public string Description { get; set; } = string.Empty;

        [DynamoDBProperty("rating")]
        public int Rating { get; set; }

        [DynamoDBProperty("price")]
        public decimal Price { get; set; }

        // S3 object key of the uploaded hotel image
        [DynamoDBProperty("fileName")]
        public string FileName { get; set; } = string.Empty;

        // Presigned S3 URL for the image; computed on read, not stored in DynamoDB
        [DynamoDBIgnore]
        public string ImageUrl { get; set; } = string.Empty;
    }
}
