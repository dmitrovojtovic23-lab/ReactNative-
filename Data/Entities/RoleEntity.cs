using Microsoft.AspNetCore.Identity;

namespace WebApiDotNet.Data.Entities;

public class RoleEntity : IdentityRole<int>
{
    public ICollection<UserRoleEntity>? UserRoles { get; set; }
}