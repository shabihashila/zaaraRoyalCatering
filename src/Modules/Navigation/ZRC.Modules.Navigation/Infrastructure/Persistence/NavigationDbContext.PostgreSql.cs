using Microsoft.EntityFrameworkCore;
using ZRC.Infrastructure.Common;
namespace Navigation.Infrastructure.Persistence;
public partial class NavigationDbContext
{
    partial void OnModelCreatingPartial(ModelBuilder modelBuilder) => DatabaseProvider.AdaptPostgres(modelBuilder, this);
}
