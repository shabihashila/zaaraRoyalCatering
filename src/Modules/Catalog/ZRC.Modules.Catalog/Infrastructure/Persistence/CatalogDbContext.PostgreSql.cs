using Microsoft.EntityFrameworkCore;
using ZRC.Infrastructure.Common;
namespace Catalog.Infrastructure.Persistence;
public partial class CatalogDbContext
{
    partial void OnModelCreatingPartial(ModelBuilder modelBuilder) => DatabaseProvider.AdaptPostgres(modelBuilder, this);
}
