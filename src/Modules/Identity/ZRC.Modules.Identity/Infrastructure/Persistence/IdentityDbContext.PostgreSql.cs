using Microsoft.EntityFrameworkCore;
using ZRC.Infrastructure.Common;
namespace Identity.Infrastructure.Persistence;
public partial class IdentityDbContext
{
    partial void OnModelCreatingPartial(ModelBuilder modelBuilder) => DatabaseProvider.AdaptPostgres(modelBuilder, this);
}
