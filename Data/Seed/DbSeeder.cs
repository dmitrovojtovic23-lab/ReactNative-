using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using WebApiDotNet.Data.Entities;

namespace WebApiDotNet.Data.Seed;

public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var context = services.GetRequiredService<MyDatabaseContext>();
        var userManager = services.GetRequiredService<UserManager<UserEntity>>();
        var roleManager = services.GetRequiredService<RoleManager<RoleEntity>>();
        
        context.Database.Migrate();

        var roleNames = new[] { "Admin", "User" };
        foreach (var roleName in roleNames)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new RoleEntity { Name = roleName });
            }
        }

        var seedUsers = new[]
        {
            new
            {
                Email = "admin@example.com",
                Password = "Admin123!",
                FirstName = "Admin",
                LastName = "User",
                Role = "Admin"
            },
            new
            {
                Email = "user@example.com",
                Password = "User123!",
                FirstName = "Test",
                LastName = "User",
                Role = "User"
            }
        };

        foreach (var seedUser in seedUsers)
        {
            var existingUser = await userManager.FindByEmailAsync(seedUser.Email);
            if (existingUser is not null)
            {
                continue;
            }

            var user = new UserEntity
            {
                UserName = seedUser.Email,
                Email = seedUser.Email,
                EmailConfirmed = true,
                FirstName = seedUser.FirstName,
                LastName = seedUser.LastName
            };

            var createResult = await userManager.CreateAsync(user, seedUser.Password);
            if (createResult.Succeeded)
            {
                await userManager.AddToRoleAsync(user, seedUser.Role);
            }
        }
    }
}
