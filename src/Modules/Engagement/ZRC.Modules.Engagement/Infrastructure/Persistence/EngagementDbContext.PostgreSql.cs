using Microsoft.EntityFrameworkCore;
using ZRC.Infrastructure.Common;
namespace Engagement.Infrastructure.Persistence;
public partial class EngagementDbContext
{
    partial void OnModelCreatingPartial(ModelBuilder modelBuilder) => DatabaseProvider.AdaptPostgres(modelBuilder, this);
}
