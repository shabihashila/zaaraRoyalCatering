using Microsoft.EntityFrameworkCore;
using ZRC.Infrastructure.Common;
namespace Content.Infrastructure.Persistence;
public partial class ContentDbContext
{
    partial void OnModelCreatingPartial(ModelBuilder modelBuilder) => DatabaseProvider.AdaptPostgres(modelBuilder, this);
}
