// © Microsoft Corporation. All rights reserved.

using System;
using System.IO;
using System.Threading.Tasks;
using Azure.Data.Tables;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace Calling
{
    [Route("/files")]
    public class FileController : Controller
    {
        string _storageAccountConnectionString;
        string _blobContainerName;
        string _tableName;

        public FileController(IConfiguration configuration)
        {
            _storageAccountConnectionString = configuration["storageAccountConnectionString"];
			_blobContainerName = "files";
			_tableName = "fileMetadata";
        }

        /// <summary>
		/// Uploads a file
		/// </summary>
		/// <returns></returns>
		[HttpPost]
		public async Task<IActionResult> PostAsync([FromForm]SendFileRequestBody body)
		{
			if (body.File == null && body.Image == null)
			{
				return BadRequest();
			}

			// TODO: Verify that user is allowed to upload files for this chat/call
			// bool isUserInThread = await this.VerifyUserInThread(chatClient, body.ThreadId);
			// if (!isUserInThread)
			// {
			// 	return this.Unauthorized();
			// }

			// Prepare Blob Storage clients and container
			string blobName = Guid.NewGuid().ToString();
			BlobContainerClient containerClient = new BlobContainerClient(_storageAccountConnectionString, _blobContainerName);
			containerClient.CreateIfNotExists();
			BlobClient blob = containerClient.GetBlobClient(blobName);
            Azure.Response<BlobContentInfo> uploadResponse;

			if (body.File != null)
			{
				Console.WriteLine($"Got file length: {body.File.Length}");
				uploadResponse = await blob.UploadAsync(body.File.OpenReadStream());
			}
			else
			{
				Console.WriteLine($"Got image length: {body.Image.Length}");
				var bytes = Convert.FromBase64String(body.Image);
				using (var stream = new MemoryStream(bytes))
				{
					uploadResponse = await blob.UploadAsync(stream);
				}
			}

			Console.WriteLine($"Uploaded blob: {blobName}");

			// Store file info in Table Storage
			TableServiceClient tableServiceClient = new TableServiceClient(_storageAccountConnectionString);
			TableClient tableClient = tableServiceClient.GetTableClient(_tableName);
			tableClient.CreateIfNotExists();
			var entity = new TableEntity(blobName, blobName)
			{
				{ "FileId", blobName },
				{ "UploadDateTime", DateTimeOffset.UtcNow }
			};
			tableClient.AddEntity(entity);
			Console.WriteLine("Added file data to table");

			return this.Ok();
		}
    }

    public class SendFileRequestBody
	{
		[FromForm(Name="file")]
		public IFormFile File { get; set; }

		[FromForm(Name="image")]
		public string Image { get; set; }
	}
}
