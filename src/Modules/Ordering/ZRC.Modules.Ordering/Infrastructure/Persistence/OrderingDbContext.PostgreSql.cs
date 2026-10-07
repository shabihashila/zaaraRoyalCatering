using Microsoft.EntityFrameworkCore;
using ZRC.Infrastructure.Common;
namespace Ordering.Infrastructure.Persistence;
public partial class OrderingDbContext
{
    partial void OnModelCreatingPartial(ModelBuilder modelBuilder) => DatabaseProvider.AdaptPostgres(modelBuilder, this);
}
