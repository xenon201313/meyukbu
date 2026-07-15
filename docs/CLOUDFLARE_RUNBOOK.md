# Cloudflare 운영 설정 가이드

이 문서는 `maple-resume.com`의 **실제 Cloudflare 계정 설정을 하는 사람**을 위한 절차입니다. 저장소에 포함된 Next.js 설정은 API·개인화 응답을 캐시하지 않고, `/_next/static/*`과 `/images/*`만 정해진 TTL로 캐시합니다. Cloudflare 계정·DNS·Vercel 프로젝트의 권한이 필요한 단계는 이 문서만으로 자동 적용되지 않습니다.

## 적용 전 준비

- Vercel 프로젝트에서 `maple-resume.com`과 `www.maple-resume.com`을 먼저 도메인으로 추가하고, **Vercel 대시보드가 제시하는 정확한 DNS 대상값**을 확인합니다. DNS 대상 IP/CNAME은 임의로 복사하지 않습니다.
- Vercel Production 환경 변수에 `APP_ORIGIN=https://maple-resume.com`, `MEYUKBU_STORAGE=prisma`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, 긴 `APP_SECRET`을 설정합니다.
- 새로운 migration이 있으면 Vercel의 `vercel-build`가 `prisma migrate deploy`를 실행하는지 확인합니다.
- 캐시 규칙을 적용하기 전 `https://maple-resume.com/api/health`가 정상 응답하는지 확인합니다.

## 1. DNS와 TLS

1. Cloudflare 대시보드에서 `maple-resume.com` zone을 열고 **DNS > Records**로 이동합니다.
2. Vercel이 지시한 apex 및 `www` 레코드를 입력합니다. Cloudflare가 apex CNAME flattening을 제공하므로, Vercel 화면의 검증 상태가 `Valid`가 될 때까지 먼저 확인합니다.
3. 검증이 끝난 웹 트래픽 레코드만 **Proxied(주황 구름)** 로 전환합니다. 메일용 MX/TXT, 도메인 검증용 레코드는 프록시하지 않습니다.
4. **SSL/TLS > Overview**에서 `Full (strict)`를 선택합니다. Vercel 쪽 도메인 인증서가 정상 발급된 뒤에만 전환해야 합니다.
5. **SSL/TLS > Edge Certificates**에서 `Always Use HTTPS`를 켭니다. 모든 서브도메인이 HTTPS를 정상 제공하는 것을 확인하기 전에는 HSTS의 `includeSubDomains`를 켜지 않습니다.

Cloudflare는 프록시된 A/AAAA/CNAME 레코드에만 DDoS 방어·WAF·캐시 규칙을 적용합니다. 자세한 동작은 [Proxy status](https://developers.cloudflare.com/dns/proxy-status/)와 [Cloudflare HTTP headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/)를 참고하세요.

## 2. 캐시 규칙

이 서비스는 편집 권한 cookie, 공개 이력서 버전, 파티 모집 상태를 다룹니다. **도메인 전체에 Cache Everything 규칙을 만들지 마세요.** 이미 있다면 제거하거나 아래 bypass 규칙보다 뒤로 둡니다.

Cloudflare **Caching > Cache Rules**에서 아래 순서대로 만듭니다.

1. **`bypass-api-and-resume-images`**
   - Custom filter expression:

     ```text
     starts_with(http.request.uri.path, "/api/") or
     matches(http.request.uri.path, "^/r/[^/]+/image$")
     ```

   - Cache eligibility: **Bypass cache**
2. **`cache-next-static`**
   - Custom filter expression:

     ```text
     starts_with(http.request.uri.path, "/_next/static/")
     ```

   - Cache eligibility: **Eligible for cache**
   - Edge TTL / Browser TTL: **Respect origin**
3. **`cache-public-boss-art`**
   - Custom filter expression:

     ```text
     starts_with(http.request.uri.path, "/images/")
     ```

   - Cache eligibility: **Eligible for cache**
   - Edge TTL / Browser TTL: **Respect origin**

앱은 API 및 생성 PNG에 `Cache-Control: private, no-store`를, 공개 보스 일러스트에 `s-maxage=604800`을 보냅니다. 따라서 브라우저와 Cloudflare의 정책이 서로 보강됩니다. Cache Rule은 순서와 `Cache Everything` 설정에 따라 조합되므로, 배포 뒤 `curl -I` 또는 브라우저 개발자 도구에서 `Cache-Control`과 `CF-Cache-Status`를 확인하세요. 관련 공식 안내는 [Cache Rules settings](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/)와 [Page Rules migration](https://developers.cloudflare.com/cache/how-to/cache-rules/page-rules-migration/)에 있습니다.

## 3. API 과부하 방어

Cloudflare **Security > WAF > Rate limiting rules**에서 최소 두 규칙을 만듭니다. 요금제에 따라 화면의 세부 명칭이나 사용 가능 여부가 다를 수 있습니다.

1. **`limit-character-search`**
   - Expression: `http.request.method eq "GET" and http.request.uri.path eq "/api/characters/resolve"`
   - Characteristic: IP
   - 권장 시작값: 60 requests / 1 minute
   - Action: Managed Challenge (문제가 없으면 Block으로 강화)
2. **`limit-api-mutations`**
   - Expression: `http.request.method in {"POST" "PATCH" "DELETE"} and starts_with(http.request.uri.path, "/api/")`
   - Characteristic: IP
   - 권장 시작값: 30 requests / 1 minute
   - Action: Managed Challenge

앱 내부의 제한은 단일 프로세스 fallback이며, 여러 Vercel instance 전체를 합산하지 않습니다. 따라서 Cloudflare WAF 제한이 서버와 NEXON API를 보호하는 첫 번째 방어선입니다. 현재 사용 가능한 파라미터는 [Rate limiting parameters](https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/)에서 확인할 수 있습니다.

## 4. Cloudflare 실제 방문자 IP를 안전하게 쓰기

Vercel 배포의 기본값 `TRUSTED_PROXY_MODE=vercel`은 Vercel edge가 찍은 `x-vercel-id`가 있을 때만 Vercel의 forwarding IP를 IP bucket으로 씁니다. Vercel은 Cloudflare를 Verified Proxy Lite 제공자로 지원하며, 프록시 앞에 있을 때도 실제 방문자 IP를 다룹니다. 직접/self-hosted origin은 `TRUSTED_PROXY_MODE=none`으로 두거나 제어하는 reverse proxy에서만 `forwarded`를 사용하세요.

Cloudflare의 비밀 헤더 방식은 Vercel 기본 동작을 대체하는 필수 단계가 아니라, origin을 직접 노출할 가능성이 있는 환경에서 `CF-Connecting-IP`를 한 번 더 인증하는 **추가 경계**입니다. 사용하려면 아래처럼 Cloudflare가 매 요청마다 비밀 헤더를 덮어쓰도록 설정합니다.

1. 비밀 관리자에서 32자 이상 임의 문자열을 하나 만듭니다. 이 값을 채팅, 저장소, 브라우저 코드에 넣지 않습니다.
2. Cloudflare **Rules > Transform Rules > Modify Request Header**에서 `cloudflare-origin-rate-limit-token` 규칙을 만듭니다.
   - When incoming requests match: `http.host eq "maple-resume.com" or http.host eq "www.maple-resume.com"`
   - Modify request header: **Set static**
   - Header name: `x-meyukbu-proxy-token`
   - Value: 위에서 만든 비밀 문자열
   - 클라이언트가 같은 이름의 헤더를 보내도 `Set static`이 값을 덮어써야 합니다.
3. Vercel Production 환경 변수에 아래를 같은 비밀값으로 추가하고 재배포합니다.

   ```dotenv
   TRUSTED_PROXY_MODE=cloudflare
   CLOUDFLARE_PROXY_SHARED_SECRET=같은_32자_이상_비밀값
   ```

4. 배포 후 Cloudflare를 지난 요청에서만 `CF-Connecting-IP`가 IP bucket으로 쓰입니다. 비밀 헤더가 없거나 틀리면 안전한 공유 bucket으로 떨어집니다.

Cloudflare는 origin에 `CF-Connecting-IP`를 전달하지만, origin이 직접 공개된 경우 이 헤더만으로는 위조 방지가 되지 않습니다. 이 앱은 Cloudflare의 static header transform과 timing-safe 비교를 함께 요구합니다. Cloudflare의 `CF-Connecting-IP` 동작은 [HTTP headers reference](https://developers.cloudflare.com/fundamentals/reference/http-headers/)에, 정적 request header 설정은 [Request Header Transform Rules](https://developers.cloudflare.com/rules/transform/request-header-modification/)에, Vercel과 Cloudflare의 Verified Proxy 동작은 [Vercel reverse proxy guide](https://vercel.com/docs/security/reverse-proxy) 및 [Vercel request headers](https://vercel.com/docs/headers/request-headers)에서 확인할 수 있습니다.

## 5. 배포 후 점검

```powershell
curl.exe -I https://maple-resume.com/api/health
curl.exe -I https://maple-resume.com/images/bosses/jupiter.png
curl.exe -I "https://maple-resume.com/r/<공개-slug>/image?v=1&layout=8"
```

- `/api/health`와 `/r/.../image`에는 `Cache-Control`에 `no-store`가 있어야 합니다.
- `/images/bosses/...`에는 `s-maxage=604800`이 있어야 하며, 반복 요청 시 `CF-Cache-Status: HIT`가 될 수 있습니다.
- Cloudflare WAF Events에서 정상 사용자가 challenge/block 되는지 첫 24시간은 확인하고, 실제 트래픽에 맞춰 임계값을 조절합니다.
- 공개 `*.vercel.app` deployment URL은 Cloudflare zone을 우회할 수 있습니다. 공유 링크는 반드시 `https://maple-resume.com`만 사용하고, Vercel에서 preview/deployment 접근 정책을 별도로 검토합니다. Cloudflare는 프록시된 사용자 도메인 트래픽만 방어합니다.
