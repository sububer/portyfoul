# HTTPS with ACM Certificate Implementation Plan

## Overview
Add HTTPS support to the ALB using AWS Certificate Manager with Route 53 DNS hosting, wildcard certificate coverage, and HTTP-to-HTTPS redirect.

## Prerequisites You'll Need
- Your domain name (e.g., `example.com`)
- Access to your domain registrar to update nameservers

---

## Phase 1: Manual Setup (Before Code Changes)

### Step 1.1: Create Route 53 Hosted Zone
**Manual AWS Console/CLI step** - create hosted zone for your domain
- Record the **4 Route 53 nameservers** (needed for registrar update)
- Note the **Hosted Zone ID** (needed for CloudFormation parameter)

### Step 1.2: Update Nameservers at Registrar
**External registrar step** - point domain to AWS Route 53
- Replace registrar's nameservers with Route 53's 4 nameservers
- DNS propagation: 5 minutes to 48 hours (typically < 1 hour)

### Step 1.3: Create ACM Certificate
**Manual AWS Console/CLI step** - request certificate in `us-east-2` region
- Primary domain: `example.com`
- Subject Alternative Name: `*.example.com`
- Validation method: **DNS validation**
- ACM will provide CNAME records for validation
- Add validation CNAME records to Route 53 (can be done via Console)
- Wait for certificate status: **Issued**
- Record the **Certificate ARN** (needed for CloudFormation parameter)

---

## Phase 2: Infrastructure Code Changes

### Step 2.1: Update CloudFormation Template (`infra/main.yaml`)

**Add new Parameters** (after line 76):
```yaml
CertificateArn:
  Type: String
  Description: ARN of ACM certificate for HTTPS

HostedZoneId:
  Type: String
  Description: Route 53 Hosted Zone ID for domain

DomainName:
  Type: String
  Description: Primary domain name (e.g., example.com)
```

**Add HTTPS Listener** (after HTTPListener ~line 716):
```yaml
HTTPSListener:
  Type: AWS::ElasticLoadBalancingV2::Listener
  Properties:
    LoadBalancerArn: !Ref ApplicationLoadBalancer
    Protocol: HTTPS
    Port: 443
    Certificates:
      - CertificateArn: !Ref CertificateArn
    DefaultActions:
      - Type: forward
        TargetGroupArn: !Ref WebTargetGroup
```

**Modify HTTPListener** (replace ~line 707-715):
Change from forward action to redirect action:
```yaml
HTTPListener:
  Type: AWS::ElasticLoadBalancingV2::Listener
  Properties:
    LoadBalancerArn: !Ref ApplicationLoadBalancer
    Protocol: HTTP
    Port: 80
    DefaultActions:
      - Type: redirect
        RedirectConfig:
          Protocol: HTTPS
          Port: 443
          StatusCode: HTTP_301
```

**Add Route 53 DNS Records** (new resources section):
```yaml
# A record for root domain
RootDomainRecord:
  Type: AWS::Route53::RecordSet
  Properties:
    HostedZoneId: !Ref HostedZoneId
    Name: !Ref DomainName
    Type: A
    AliasTarget:
      HostedZoneId: !GetAtt ApplicationLoadBalancer.CanonicalHostedZoneID
      DNSName: !GetAtt ApplicationLoadBalancer.DNSName

# A record for wildcard subdomains
WildcardDomainRecord:
  Type: AWS::Route53::RecordSet
  Properties:
    HostedZoneId: !Ref HostedZoneId
    Name: !Sub "*.${DomainName}"
    Type: A
    AliasTarget:
      HostedZoneId: !GetAtt ApplicationLoadBalancer.CanonicalHostedZoneID
      DNSName: !GetAtt ApplicationLoadBalancer.DNSName
```

**Add new Outputs** (after line 1107):
```yaml
HTTPSURL:
  Description: HTTPS URL of the application
  Value: !Sub "https://${DomainName}"

ALBHTTPSListener:
  Description: HTTPS Listener ARN
  Value: !Ref HTTPSListener
```

### Step 2.2: Update Deployment Script (`scripts/deploy.py`)

**Add new parameters to stack update** (~line 200):
- Add certificate ARN, hosted zone ID, and domain name to parameter list
- Update parameter retrieval logic to handle new params

### Step 2.3: Create Helper Script for Certificate Setup

**New file**: `scripts/setup-certificate.sh`
- Provides step-by-step instructions for manual ACM setup
- Includes AWS CLI commands with placeholders
- Outputs certificate ARN for CloudFormation

### Step 2.4: Update Documentation

**Update `infra/README.md`**:
- Add HTTPS setup section
- Document new CloudFormation parameters
- Add troubleshooting for certificate validation

**Update `.env.example`** (if applicable):
- Add domain configuration variables

---

## Phase 3: Deployment

### Step 3.1: Validate CloudFormation Template
```bash
aws cloudformation validate-template --template-body file://infra/main.yaml
```

### Step 3.2: Update CloudFormation Stack
```bash
aws cloudformation update-stack \
  --stack-name portyfoul-dev \
  --template-body file://infra/main.yaml \
  --parameters \
    ParameterKey=CertificateArn,ParameterValue=<YOUR_CERT_ARN> \
    ParameterKey=HostedZoneId,ParameterValue=<YOUR_ZONE_ID> \
    ParameterKey=DomainName,ParameterValue=example.com \
    <... existing parameters ...> \
  --capabilities CAPABILITY_IAM
```

### Step 3.3: Monitor Stack Update
Wait for stack update to complete (~3-5 minutes)

### Step 3.4: Verify HTTPS
- Test: `https://example.com`
- Test: `https://www.example.com`
- Test: `http://example.com` (should redirect to HTTPS)
- Verify certificate in browser

---

## User Action Items Summary

### Before Running Code:
1. ✅ Create Route 53 hosted zone → get nameservers
2. ✅ Update nameservers at your registrar
3. ✅ Wait for DNS propagation (verify with `dig NS example.com`)
4. ✅ Request ACM certificate with `example.com` + `*.example.com`
5. ✅ Add DNS validation records to Route 53
6. ✅ Wait for certificate validation → get certificate ARN

### After Code Changes:
7. ✅ Run `aws cloudformation update-stack` with new parameters
8. ✅ Test HTTPS access and HTTP redirect
9. ✅ Update any hardcoded HTTP URLs in application config

---

## Files to Modify
1. `infra/main.yaml` - Add HTTPS listener, Route 53 records, parameters
2. `scripts/deploy.py` - Support new CloudFormation parameters
3. `scripts/setup-certificate.sh` - New helper script (optional)
4. `infra/README.md` - Document HTTPS setup process

## Estimated Time
- Manual setup (Phase 1): 30-60 minutes
- Code changes (Phase 2): 20-30 minutes
- Deployment (Phase 3): 10 minutes
- **Total**: ~1-2 hours

## Cost Impact
- ACM Certificate: **$0/month** (free)
- Route 53 Hosted Zone: **$0.50/month**
- Route 53 DNS Queries: **$0.40/million queries** (~$0.50/month typical)
- **Total new cost**: ~$1/month

## Progress Tracking

- [x] Phase 1: Manual Setup
  - [x] Step 1.1: Create Route 53 Hosted Zone (Z00364892BW91A1O6XV4P)
  - [x] Step 1.2: Update Nameservers at Registrar
  - [x] Step 1.3: Create ACM Certificate (arn:aws:acm:us-east-2:946652103073:certificate/18e4a084-98bf-4bf4-93b2-9f03615dc3b2)
- [x] Phase 2: Infrastructure Code Changes
  - [x] Step 2.1: Update CloudFormation Template
  - [x] Step 2.2: Update Deployment Script
  - [x] Step 2.3: Create Helper Script
  - [x] Step 2.4: Update Documentation
- [x] Phase 3: Deployment
  - [x] Step 3.1: Validate CloudFormation Template
  - [x] Step 3.2: Update CloudFormation Stack
  - [x] Step 3.3: Monitor Stack Update
  - [x] Step 3.4: Verify HTTPS

## Captured Values for halfzed.com

- **Domain Name**: halfzed.com
- **Hosted Zone ID**: Z00364892BW91A1O6XV4P
- **Certificate ARN**: arn:aws:acm:us-east-2:946652103073:certificate/18e4a084-98bf-4bf4-93b2-9f03615dc3b2
- **Region**: us-east-2
- **Certificate Coverage**: halfzed.com + *.halfzed.com
- **Certificate Status**: ISSUED ✅
- **Deployment Status**: LIVE ✅

## Deployment Summary

### Infrastructure Changes Completed

1. **HTTPS Listener (port 443)**: Created and active
   - Protocol: HTTPS
   - SSL Policy: ELBSecurityPolicy-TLS13-1-2-2021-06
   - Certificate: Amazon RSA 2048 M04
   - Action: Forward to target group

2. **HTTP Listener (port 80)**: Updated to redirect
   - Protocol: HTTP
   - Action: 301 redirect to HTTPS

3. **DNS Records Created**:
   - `halfzed.com` → ALB (A record, alias)
   - `*.halfzed.com` → ALB (A record, alias)

4. **Secret References Fixed**:
   - Updated task definitions to use full secret ARNs
   - Fixed JWT secret, Finnhub API key, CoinGecko API key references
   - Removed invalid wildcard `*` syntax

### Verification Results

✅ **Canonical URL**: https://porty.halfzed.com returns HTTP/2 200
✅ **Root Domain Redirect**: https://halfzed.com → https://porty.halfzed.com (301)
✅ **WWW Redirect**: https://www.halfzed.com → https://porty.halfzed.com (301)
✅ **HTTP to HTTPS**: http://porty.halfzed.com → https://porty.halfzed.com (301)
✅ **Path Preservation**: Redirects maintain paths and query strings
✅ **Certificate Valid**: Issued by Amazon, valid until Dec 15, 2026
✅ **Auto-renewal**: Managed by AWS Certificate Manager

### URLs

- **Canonical (Primary)**: https://porty.halfzed.com
- **Root Domain**: https://halfzed.com (redirects to porty subdomain)
- **WWW Subdomain**: https://www.halfzed.com (redirects to porty subdomain)
- **Other Subdomains**: https://*.halfzed.com (covered by wildcard certificate)

### Next Steps

No immediate action required. The HTTPS setup is complete and functional.

**Optional Future Enhancements**:
- Consider end-to-end encryption (ALB → ECS over HTTPS)
- Add additional subdomains as needed (automatically covered by wildcard)
- Monitor certificate renewal (automatic, no action needed)

### Issues Encountered and Resolved

**Issue 1**: ECS service deployment failures during initial stack update
- **Cause**: Task definitions referenced secrets with invalid wildcard `*` syntax
- **Resolution**: Updated secret ARNs to use full suffix (e.g., `-GEcWhM`)
- **Files Modified**: `infra/main.yaml` (lines 849, 852, 855, 952, 955, 958)

**Issue 2**: Stack update rollback on first attempt
- **Cause**: Circuit breaker triggered due to secret validation errors
- **Resolution**: Fixed secret ARNs and re-ran stack update successfully

---

## Enhancement: Domain Redirect Configuration

**Date**: November 16, 2025
**Objective**: Configure `porty.halfzed.com` as canonical URL with redirects from root and www

### Changes Implemented

1. **ALB Listener Rules Added**:
   - `RootDomainRedirectRule`: Redirects `halfzed.com` → `porty.halfzed.com` (Priority 1)
   - `WWWRedirectRule`: Redirects `www.halfzed.com` → `porty.halfzed.com` (Priority 2)
   - Both rules use HTTP 301 (permanent redirect)
   - Path and query strings preserved in redirects

2. **CloudFormation Outputs Updated**:
   - `HTTPSURL`: Changed from `https://halfzed.com` to `https://porty.halfzed.com`
   - `CanonicalURL`: New output showing canonical URL
   - `RedirectURLs`: New output listing redirect sources

3. **Files Modified**:
   - `infra/main.yaml`: Added listener rules (lines 814-853), updated outputs
   - `plans/acm_certificate_plan.md`: Updated URLs and verification results

### Redirect Behavior

| Source URL | Action | Destination | Status Code |
|------------|--------|-------------|-------------|
| `http://porty.halfzed.com` | HTTP→HTTPS | `https://porty.halfzed.com` | 301 |
| `https://porty.halfzed.com` | Serve | Application | 200 |
| `https://halfzed.com` | Redirect | `https://porty.halfzed.com` | 301 |
| `https://www.halfzed.com` | Redirect | `https://porty.halfzed.com` | 301 |
| `http://halfzed.com` | HTTP→HTTPS→Redirect | `https://porty.halfzed.com` | 301×2 |
| `http://www.halfzed.com` | HTTP→HTTPS→Redirect | `https://porty.halfzed.com` | 301×2 |

### SEO Benefits

- Single canonical URL improves search engine ranking
- 301 redirects preserve link equity
- Consistent URL structure prevents duplicate content issues
- Future flexibility to host different content on root domain

---

## Future Considerations

### When Adding a Main Website to Root Domain

When you're ready to deploy a main website to `halfzed.com`, follow these steps:

#### Option 1: Remove Redirects (Separate Sites)

**Use Case**: Main website and portfolio are independent applications

**Steps**:
1. **Update CloudFormation Template**:
   - Remove or comment out `RootDomainRedirectRule` and `WWWRedirectRule`
   - Keep DNS records pointing to ALB
   - Add new listener rules to route by host header to different target groups

2. **Deploy Main Website**:
   - Create new ECS service for main website
   - Create new target group for main website
   - Add listener rule: `halfzed.com` → main website target group
   - Add listener rule: `www.halfzed.com` → main website target group
   - Default rule (no host match) → portfolio target group

3. **Result**:
   - `https://halfzed.com` → Main website
   - `https://www.halfzed.com` → Main website
   - `https://porty.halfzed.com` → Portfolio (unchanged)

#### Option 2: Keep Portfolio as Landing (Main Website Elsewhere)

**Use Case**: Main website on different subdomain or external service

**Steps**:
1. Update listener rules to redirect to new main site location
2. Keep portfolio redirect or make it the default catch-all

#### Option 3: Migrate Portfolio to Root (Less Recommended)

**Use Case**: Portfolio becomes the main website

**Steps**:
1. Remove redirect rules
2. Update listener to serve portfolio on all domains
3. Optional: Redirect `porty.halfzed.com` to root for consistency

### Implementation Checklist

When modifying the domain structure:

- [ ] Review current listener rules and priorities
- [ ] Plan target group configuration
- [ ] Update CloudFormation template
- [ ] Test in development/staging first
- [ ] Validate template before deployment
- [ ] Create CloudFormation change set to preview changes
- [ ] Update documentation
- [ ] Communicate URL changes to users (if applicable)
- [ ] Monitor traffic patterns after deployment
- [ ] Update SEO tools and analytics with new URLs

### Zero-Downtime Migration Strategy

**Recommended Approach**:
1. Deploy new main website service first (no DNS changes)
2. Test new service via ALB DNS name
3. Update CloudFormation with new listener rules
4. Stack update applies changes atomically
5. Verify all URLs route correctly
6. Update external references gradually

### Technical Notes

- **ALB Listener Rules**: Evaluated in priority order (lowest first)
- **Host Header Matching**: Case-insensitive, supports wildcards
- **Target Groups**: Can have different health check settings
- **ECS Services**: Can run multiple services behind same ALB
- **Certificate**: Single wildcard cert covers all subdomains (no changes needed)
- **DNS**: All subdomains already point to ALB (no DNS propagation wait)

### Cost Considerations

Adding a main website service:
- Additional ECS tasks: ~$15-30/month (depending on size)
- Target group: Included in ALB pricing
- Listener rules: Included in ALB pricing
- No additional certificate cost (wildcard covers all)

**Total additional cost**: ~$15-30/month for main website service
