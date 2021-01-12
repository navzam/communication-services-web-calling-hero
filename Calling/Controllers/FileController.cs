// © Microsoft Corporation. All rights reserved.

using System;
using System.IO;
using System.Linq;
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
		/// Gets a list of metadata for files
		/// </summary>
		/// <returns></returns>
		[HttpGet]
		public async Task<IActionResult> GetAsync()
		{
			// TODO: Verify that user is allowed to get files for this chat/call

			// Get file info from Table Storage
			TableServiceClient tableServiceClient = new TableServiceClient(_storageAccountConnectionString);
			TableClient tableClient = tableServiceClient.GetTableClient(_tableName);
			tableClient.CreateIfNotExists();
			var tableEntities = tableClient.Query<TableEntity>();
			var files = tableEntities.Select(tableEntity => new FileMetadata
			{
				Id = tableEntity.GetString("FileId"),
				Name = tableEntity.GetString("FileName"),
				UploadDateTime = tableEntity.GetDateTimeOffset("UploadDateTime").Value,
			});

			return Ok(files);
		}

        /// <summary>
		/// Gets the content of a specific file
		/// </summary>
		/// <returns></returns>
		[HttpGet("{fileId}")]
		public async Task<IActionResult> GetFileAsync(string fileId)
		{
			// TODO: Verify that user is allowed to get files for this chat/call

			// Prepare Table Storage clients
			TableServiceClient tableServiceClient = new TableServiceClient(_storageAccountConnectionString);
			TableClient tableClient = tableServiceClient.GetTableClient(_tableName);
			tableClient.CreateIfNotExists();

			// Get file info from Table Storage
			Azure.Response<TableEntity> getTableEntityResponse;
			try
			{
				getTableEntityResponse = await tableClient.GetEntityAsync<TableEntity>(fileId, fileId);
			}
			catch (Azure.RequestFailedException e)
			{
				if (e.Status == 404)
				{
					return NotFound();
				}

				return BadRequest("Couldn't get file from storage");
			}

			var fileName = getTableEntityResponse.Value.GetString("FileName");

			// Prepare Blob Storage clients and container
			BlobContainerClient containerClient = new BlobContainerClient(_storageAccountConnectionString, _blobContainerName);
			containerClient.CreateIfNotExists();
			BlobClient blob = containerClient.GetBlobClient(fileId);

			// MemoryStream blobStream = new MemoryStream();
			// var downloadResult = await blob.DownloadToAsync(blobStream);
			var blobStream = await blob.OpenReadAsync();

			return new FileStreamResult(blobStream, "application/octet-stream") { FileDownloadName = fileName };
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
				return BadRequest("Invalid file");
			}

			if (string.IsNullOrWhiteSpace(body.FileName))
			{
				return BadRequest("Invalid file name");
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
				{ "FileName", body.FileName },
				{ "UploadDateTime", DateTimeOffset.UtcNow }
			};
			tableClient.AddEntity(entity);
			Console.WriteLine("Added file data to table");

			return this.Ok();
		}
    }

	public class FileMetadata
	{
		public string Id { get; set; }

		public string Name { get; set; }

		public DateTimeOffset UploadDateTime { get; set; }
	}

    public class SendFileRequestBody
	{
		[FromForm(Name="file")]
		public IFormFile File { get; set; }

		[FromForm(Name="image")]
		public string Image { get; set; }

		[FromForm(Name="filename")]
		public string FileName { get; set; }
	}
}
