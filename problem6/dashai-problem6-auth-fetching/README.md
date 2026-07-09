# DashAI Problem 6

Frontend auth dan data-fetching hardening.

## Perubahan

- Access token hanya disimpan di memory.
- Refresh token tidak pernah dibaca atau disimpan oleh JavaScript.
- Refresh memakai HttpOnly cookie dengan `withCredentials`.
- Semua request `401` memakai satu refresh promise yang sama.
- Reload halaman melakukan bootstrap access token dari refresh cookie.
- Query auth disinkronkan setelah login/logout.
- Logout memanggil backend terlebih dahulu.
- React Query tidak mengulang error bisnis 4xx.
- React Query Devtools hanya muncul saat development.
- `auth-scope.ts` tidak lagi membaca token dari localStorage/sessionStorage.

## Instalasi

```powershell
Expand-Archive `
  .\dashai-problem6-auth-fetching.zip `
  .\problem6 `
  -Force

python `
  .\problem6\dashai-problem6-auth-fetching\install_problem6.py
```

## Test

```powershell
powershell -ExecutionPolicy Bypass `
  -File .\run_problem6_tests.ps1
```

Mode cepat tanpa production build:

```powershell
powershell -ExecutionPolicy Bypass `
  -File .\run_problem6_tests.ps1 `
  -SkipBuild
```

## Runtime manual

1. Login.
2. Refresh browser pada `/dashboard`.
3. Session harus tetap aktif.
4. Hapus access token memory dengan reload; frontend harus memperoleh token baru lewat cookie.
5. Logout.
6. Refresh `/dashboard`; harus diarahkan ke `/login`.
