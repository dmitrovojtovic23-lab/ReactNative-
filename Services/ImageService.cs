namespace WebApiDotNet.Services;

public class ImageService : IImageService
{
    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
    private const long MaxSizeBytes = 5 * 1024 * 1024;

    private readonly string _folder;

    public ImageService(IWebHostEnvironment environment)
    {
        var root = environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot");
        _folder = Path.Combine(root, "images");
        Directory.CreateDirectory(_folder);
    }

    public async Task<string> SaveImageAsync(IFormFile image)
    {
        if (image is null || image.Length == 0)
        {
            throw new ArgumentException("Файл зображення відсутній");
        }

        if (image.Length > MaxSizeBytes)
        {
            throw new ArgumentException("Максимальний розмір зображення 5 МБ");
        }

        var extension = Path.GetExtension(image.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
        {
            throw new ArgumentException("Допустимі формати: jpg, jpeg, png, webp, gif");
        }

        var fileName = $"{Guid.NewGuid()}{extension}";
        var path = Path.Combine(_folder, fileName);

        await using var stream = new FileStream(path, FileMode.Create);
        await image.CopyToAsync(stream);

        return fileName;
    }

    public void DeleteImageIfExists(string? fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return;
        }

        var path = Path.Combine(_folder, fileName);
        if (File.Exists(path))
        {
            File.Delete(path);
        }
    }
}
