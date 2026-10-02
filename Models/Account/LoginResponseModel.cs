namespace WebApiDotNet.Models.Account;

public class LoginResponseModel
{
    public string Token { get; set; } = null!;
    public int UserId { get; set; }
    public string Email { get; set; } = null!;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Image { get; set; }
    public IList<string> Roles { get; set; } = new List<string>();
}
