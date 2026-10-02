using WebApiDotNet.Data.Entities;

namespace WebApiDotNet.Services;

public interface IJwtTokenService
{
    string GenerateToken(UserEntity user, IList<string> roles);
}
