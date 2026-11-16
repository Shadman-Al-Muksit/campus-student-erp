"""Create ignored local credentials once; never print their values."""
from pathlib import Path
import secrets

target = Path(__file__).resolve().parent.parent / '.env'
if not target.exists():
    target.write_text('\n'.join([
        'DJANGO_DEBUG=1', 'DJANGO_SECRET_KEY=' + secrets.token_urlsafe(48),
        'DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,testserver',
        'PGHOST=127.0.0.1', 'PGPORT=55432', 'PGDATABASE=campus_erp',
        'PGUSER=campus_erp', 'PGPASSWORD=' + secrets.token_urlsafe(32), '',
    ]), encoding='utf-8')
    target.chmod(0o600)
    print('Created ignored local settings.')
else:
    print('Existing local settings preserved.')
