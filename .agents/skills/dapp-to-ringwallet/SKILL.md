---
name: dapp-to-ringwallet
description: Integrates a DApp into Ring Wallet by adding dappsdk.js and configuring CSP for iframe embedding.
allowed-tools: Read, Write, StrReplace, Glob, Grep, Shell, ReadLints
model: sonnet
license: MIT
metadata:
  author: ringprotocol
  version: '0.2.0'
---

# DApp to Ring Wallet Integration

Ring Wallet is a DApp container that opens DApps inside an iframe. Integration requires **two mandatory changes** — both MUST be completed:

1. **Add `dappsdk.js`** — the SDK script that provides `window.ethereum` (EIP-1193) and EIP-6963 provider discovery inside the Ring Wallet iframe.
2. **Add CSP (Content Security Policy)** — allow the SDK script source and allow Ring Wallet to embed the DApp in an iframe.

## When to Use

Use this skill when the user asks to integrate their DApp with Ring Wallet, add the Ring Wallet SDK, or make a DApp work inside Ring Wallet's iframe.

---

## Step 1: Add dappsdk.js

### What it does

- **EIP-1193**: Injects `window.ethereum` with a `RingWalletProvider` that communicates with the parent Ring Wallet frame via `postMessage`.
- **EIP-6963**: Announces the wallet via `eip6963:announceProvider` events (rdns: `org.testring.ringwallet`). Wagmi 2+, ConnectKit, RainbowKit, and similar libraries auto-discover it.
- **Network proxy**: When loaded inside Ring Wallet, intercepts `fetch`/`XHR` to route requests through the wallet's proxy, eliminating CORS issues for the DApp.
- **Inside iframe**: Always overrides `window.ethereum`. The DApp talks to Ring Wallet exclusively.
- **Standalone browser**: Only sets `window.ethereum` if no other wallet exists. Announces via EIP-6963 so wallet-selection UIs can discover it without conflicting with MetaMask or other extensions.

### How to add

1. Find the HTML entry point(s) — typically `index.html` at the app root.
2. Add a `<script>` tag in `<head>`, **before** any app bundle `<script>` tags:

```html
<script src="https://wallet.ring.exchange/dappsdk.js"></script>
```

The script MUST load before the app initializes so `window.ethereum` and EIP-6963 announcements are ready when wagmi/ethers/web3 starts.

If the user provides a different dappsdk.js URL (self-hosted or alternate environment), use that URL instead.

---

## Step 2: Add CSP Configuration

**Both sub-steps (2a and 2b) are MANDATORY. Do NOT skip either one.**

### 2a. Allow the SDK script source (`script-src`)

The DApp must allow scripts from the `dappsdk.js` host domain.

**If the DApp already has a CSP** (via `<meta>` tag or HTTP headers): add `https://wallet.ring.exchange` to the existing `script-src` directive.

**If the DApp has NO existing CSP**: add a `<meta>` tag in `<head>`, before the dappsdk.js script tag:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://wallet.ring.exchange;"
/>
```

`'unsafe-inline'` and `'unsafe-eval'` are included because most Vite/React/webpack apps require them. `'wasm-unsafe-eval'` is included because many DeFi DApps use WebAssembly. Adjust based on the app's actual needs.

### 2b. Allow iframe embedding (`frame-ancestors`)

Ring Wallet embeds the DApp in an iframe. The DApp MUST allow this via `frame-ancestors`.

**IMPORTANT**: `frame-ancestors` CANNOT be set via `<meta>` tags — it MUST be set via HTTP response headers in the deployment configuration.

#### Vercel (`vercel.json`)

Add or merge into the existing `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "frame-ancestors 'self' https://wallet.ring.exchange;"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        }
      ]
    }
  ]
}
```

If `vercel.json` already has other config (e.g. `rewrites`), merge the `headers` array into the existing file — do not overwrite.

#### Netlify / Fleek (`_headers` file)

```
/*
  Content-Security-Policy: frame-ancestors 'self' https://wallet.ring.exchange;
  X-Frame-Options: SAMEORIGIN
```

#### X-Frame-Options remediation

Many hosting platforms (e.g. Vercel) set `X-Frame-Options: DENY` by default, which blocks iframe embedding. You MUST explicitly override it by setting `X-Frame-Options: SAMEORIGIN` in the deployment headers (as shown in the examples above). While `frame-ancestors` CSP is the modern standard, `X-Frame-Options` must also be set because browsers still enforce it and platform defaults cannot be removed — only overridden.

---

## Implementation Checklist

When implementing, complete ALL of the following:

1. Find all HTML entry points (`index.html` files for each app)
2. Add `<meta http-equiv="Content-Security-Policy" ...>` in `<head>` (or update existing CSP) to allow `script-src ... https://wallet.ring.exchange`
3. Add `<script src="https://wallet.ring.exchange/dappsdk.js"></script>` in `<head>` before app bundle scripts
4. Find deployment config (`vercel.json`, `_headers`, server config, etc.)
5. Add `frame-ancestors 'self' https://wallet.ring.exchange` via HTTP headers in deployment config
6. Override `X-Frame-Options` to `SAMEORIGIN` in deployment headers (platforms like Vercel default to `DENY`)

---

## Testing

Test the integration at:

```
https://wallet.ring.exchange/?testdapp=YOUR_API_KEY Or YOUR_DAPP_NAME
```

Verify:

- Console shows: `[Ring Wallet] DApp SDK v1.0.0 initialized (iframe mode)`
- `window.ethereum.isRingWallet === true` inside the iframe
- Wallet connection (`eth_requestAccounts`) returns accounts
- Transaction signing works
- Chain switching (`chainChanged` events) propagates correctly

---

## Do Not Do

- Do NOT skip CSP — both `script-src` and `frame-ancestors` are mandatory.
- Do NOT treat CSP as optional or "only if CSP exists" — always add it.
- Do NOT place the `<script>` tag after app bundle scripts — it must load first.
- Do NOT leave `X-Frame-Options` as `DENY` — override it to `SAMEORIGIN` in deployment headers alongside the `frame-ancestors` CSP directive.
- Do NOT claim Ring Wallet requires non-standard wallet APIs — it uses standard EIP-1193 and EIP-6963.
