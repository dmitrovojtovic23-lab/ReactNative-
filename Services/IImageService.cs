namespace WebApiDotNet.Services;

public interface IImageService
{
    Task<string> SaveImageAsync(IFormFile image);
    void DeleteImageIfExists(string? fileName);
}
