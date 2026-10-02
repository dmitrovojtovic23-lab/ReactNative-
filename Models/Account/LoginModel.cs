namespace WebApiDotNet.Models.Account;

public class LoginModel
{
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
}
