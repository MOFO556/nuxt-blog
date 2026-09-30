interface ParsedUA {
  browser: { name: string; version: string };
  engine: { name: string; version: string };
  os: { name: string; version: string };
  device: { type: "desktop" | "mobile" | "tablet" | "bot" | "console" | "unknown"; vendor: string; model: string };
  cpu: { architecture: string };
  raw: string;
}

export function parseUserAgent(ua: string): ParsedUA {
  const result: ParsedUA = {
    browser: { name: "Unknown", version: "" },
    engine: { name: "Unknown", version: "" },
    os: { name: "Unknown", version: "" },
    device: { type: "unknown", vendor: "", model: "" },
    cpu: { architecture: "" },
    raw: ua,
  };

  if (!ua) 
    return result;
  
  const enginePatterns: Array<[RegExp, string]> = [
    [/Blink\/([\d.]+)/, "Blink"],
    [/Gecko\/([\d.]+)/, "Gecko"],
    [/Trident\/([\d.]+)/, "Trident"],
    [/Presto\/([\d.]+)/, "Presto"],
    [/AppleWebKit\/([\d.]+)/, "WebKit"],
  ];
  for (const [re, name] of enginePatterns) {
    const m = ua.match(re);
    if (m) {
      result.engine = { name, version: m[1] || '' };
      break;
    }
  }
  if (result.engine.name === "WebKit" && /Chrome|Chromium|Edg|OPR\//.test(ua)) {
    result.engine.name = "Blink";
  }
  
  const browserPatterns: Array<[RegExp, string]> = [
    [/Edg(?:e|A|iOS)?\/([\d.]+)/, "Edge"],
    [/OPR\/([\d.]+)/, "Opera"],
    [/Opera[ /]([\d.]+)/, "Opera"],
    [/SamsungBrowser\/([\d.]+)/, "Samsung Internet"],
    [/YaBrowser\/([\d.]+)/, "Yandex"],
    [/UCBrowser\/([\d.]+)/, "UC Browser"],
    [/CriOS\/([\d.]+)/, "Chrome"],
    [/FxiOS\/([\d.]+)/, "Firefox"],
    [/Firefox\/([\d.]+)/, "Firefox"],
    [/Chrome\/([\d.]+)/, "Chrome"],
    [/Chromium\/([\d.]+)/, "Chromium"],
    [/Version\/([\d.]+).*Safari/, "Safari"],
    [/MSIE ([\d.]+)/, "Internet Explorer"],
    [/rv:([\d.]+).*Trident/, "Internet Explorer"],
  ];
  for (const [re, name] of browserPatterns) {
    const m = ua.match(re);
    if (m) {
      result.browser = { name, version: m[1] || ''};
      break;
    }
  }
  
  const osPatterns: Array<[RegExp, string]> = [
    [/Windows NT 10\.0/, "Windows 10/11"],
    [/Windows NT 6\.3/, "Windows 8.1"],
    [/Windows NT 6\.2/, "Windows 8"],
    [/Windows NT 6\.1/, "Windows 7"],
    [/Windows NT 6\.0/, "Windows Vista"],
    [/Windows NT 5\.1/, "Windows XP"],
    [/Windows Phone ([\d.]+)/, "Windows Phone"],
    [/Android[ /]([\d.]+)/, "Android"],
    [/(?:iPhone|CPU) OS ([\d_]+)/, "iOS"],
    [/iPad;.*OS ([\d_]+)/, "iOS"],
    [/Mac OS X ([\d_.]+)/, "macOS"],
    [/CrOS \w+ ([\d.]+)/, "ChromeOS"],
    [/Ubuntu/, "Ubuntu"],
    [/Fedora/, "Fedora"],
    [/Linux/, "Linux"],
  ];
  for (const [re, name] of osPatterns) {
    const m = ua.match(re);
    if (m) {
      const version = (m[1] ?? "").replace(/_/g, ".");
      result.os = { name, version };
      break;
    }
  }

  if (result.os.name === "macOS" && result.os.version)
    result.os.version = result.os.version.replace(/_/g, ".");
  
  const isTablet = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/.test(ua);
  const isMobile = /Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|Opera Mini/i.test(ua);
  const isBot = /bot|crawler|spider|crawling|slurp|bingpreview/i.test(ua);
  const isConsole = /PlayStation|Xbox|Nintendo/i.test(ua);

  if (isBot) 
    result.device.type = "bot";
  else if (isConsole) 
    result.device.type = "console";
  else if (isTablet) 
    result.device.type = "tablet";
  else if (isMobile) 
    result.device.type = "mobile";
  else 
    result.device.type = "desktop";

  if (/iPhone/.test(ua)) {
    result.device.vendor = "Apple"; 
    result.device.model = "iPhone";
  }
  else if (/iPad/.test(ua)) {
    result.device.vendor = "Apple"; 
    result.device.model = "iPad";
  }
  else if (/Macintosh/.test(ua)) { 
    result.device.vendor = "Apple"; 
    result.device.model = "Mac"; 
  }
  else {
    const android = ua.match(/Android[^;]*;\s*([^;)]+?)(?:\s+Build|\))/);
    if (android) {
      const [vendor, ...rest] = android[1]?.trim()?.split(/\s+/) || [];
      if (vendor) {
        result.device.vendor = vendor;
        result.device.model = rest.join(" ") || vendor;
      }
    }
  }
  
  if (/arm64|aarch64/i.test(ua)) 
    result.cpu.architecture = "arm64";
  else if (/arm/i.test(ua)) 
    result.cpu.architecture = "arm";
  else if (/x86_64|Win64|x64|amd64/i.test(ua)) 
    result.cpu.architecture = "x64";
  else if (/i686|i386|x86/i.test(ua)) 
    result.cpu.architecture = "x86";
  else if (/ppc|powerpc/i.test(ua)) 
    result.cpu.architecture = "ppc";

  return result;
}

export function formatUserAgent(ua: string): string {
  const p = parseUserAgent(ua);
  const browser = p.browser.version
    ? `${p.browser.name} ${p.browser.version.split(".")[0]}`
    : p.browser.name;
  const os = p.os.version ? `${p.os.name} ${p.os.version}` : p.os.name;
  return `${browser} on ${os} (${p.device.type})`;
}