import { NextRequest, NextResponse } from "next/server";
import { env, isOpenRouterConfigured } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    const { events, origin, destination } = await request.json();

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: "Events array is required" },
        { status: 400 }
      );
    }

    if (!isOpenRouterConfigured()) {
      return NextResponse.json(
        { error: "AI not configured" },
        { status: 503 }
      );
    }

    // Extract messages that need translation (non-English)
    const textsToTranslate = events
      .map((e: { message: string }, i: number) => ({ index: i, text: e.message }))
      .filter(({ text }: { text: string }) => /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text)); // Has Chinese characters

    console.log(`Found ${textsToTranslate.length} messages to translate out of ${events.length} total`);

    if (textsToTranslate.length === 0) {
      return NextResponse.json({ events, translated: false });
    }

    // Hardcoded translations for common Chinese shipping terms (ultimate fallback)
    const CHINESE_TRANSLATIONS: Record<string, string> = {
      "到达寄达地": "Arrived at destination",
      "飞机进港": "Aircraft arrived",
      "飞机进港，飞机进港（到达目的地）": "Aircraft arrived at destination airport",
      "飞机进港，飞机进港（到达中转地）": "Aircraft arrived at transit hub",
      "航空公司启运": "Airline departure",
      "航空公司接收": "Received by airline",
      "已交承运商运输": "Handed over to carrier",
      "出口海关/放行": "Export customs cleared",
      "出口海关/留存待验": "Export customs inspection pending",
      "送交出口海关": "Submitted to export customs",
      "已出口直封": "Direct export sealed",
      "中国邮政已收取快件": "China Post received package",
      "邮件已乘机": "Package on flight",
      "准备发出": "Ready for dispatch",
      "完成分拣": "Sorting completed",
      "正在发往下一站": "en route to next station",
      "正在发往航站准备安检": "en route to airport for security check",
      "准备发往": "ready to dispatch to",
    };

    // Common Chinese location names
    const LOCATION_TRANSLATIONS: Record<string, string> = {
      // Cities
      "上海市": "Shanghai",
      "上海": "Shanghai",
      "北京市": "Beijing",
      "北京": "Beijing",
      "广州市": "Guangzhou",
      "广州": "Guangzhou",
      "深圳市": "Shenzhen",
      "深圳": "Shenzhen",
      "成都市": "Chengdu",
      "成都": "Chengdu",
      "杭州市": "Hangzhou",
      "杭州": "Hangzhou",
      "南京市": "Nanjing",
      "南京": "Nanjing",
      "武汉市": "Wuhan",
      "武汉": "Wuhan",
      "西安市": "Xi'an",
      "西安": "Xi'an",
      "重庆市": "Chongqing",
      "重庆": "Chongqing",
      "天津市": "Tianjin",
      "天津": "Tianjin",
      "苏州市": "Suzhou",
      "苏州": "Suzhou",
      "郑州市": "Zhengzhou",
      "郑州": "Zhengzhou",
      // Countries
      "爱尔兰": "Ireland",
      "中国": "China",
      "美国": "United States",
      "英国": "United Kingdom",
      "德国": "Germany",
      "法国": "France",
      "日本": "Japan",
      "韩国": "South Korea",
      "澳大利亚": "Australia",
      "加拿大": "Canada",
      "新加坡": "Singapore",
      "马来西亚": "Malaysia",
      "泰国": "Thailand",
      "越南": "Vietnam",
      "印度": "India",
      "俄罗斯": "Russia",
      "巴西": "Brazil",
      "意大利": "Italy",
      "西班牙": "Spain",
      "荷兰": "Netherlands",
      // Facilities
      "国际互换局": "International Exchange Office",
      "国际邮件互换局": "International Mail Exchange",
      "航空中心": "Air Center",
      "邮件处理中心": "Mail Processing Center",
      "包件车间": "Parcel Workshop",
      "揽投部": "Collection & Delivery Dept",
      "双流区": "Shuangliu District",
      "黄河中路": "Huanghe Middle Road",
      "嘉民": "Jialin",
      "寄递事业部": "Delivery Division",
      "四川省": "Sichuan",
    };

    const translateLocations = (text: string): string => {
      let result = text;
      for (const [chinese, english] of Object.entries(LOCATION_TRANSLATIONS)) {
        result = result.replace(new RegExp(chinese, "g"), english);
      }
      // Clean up brackets
      result = result.replace(/【/g, "[").replace(/】/g, "]");
      return result;
    };

    const translateWithFallback = (text: string): string => {
      // Exact match
      if (CHINESE_TRANSLATIONS[text]) return translateLocations(CHINESE_TRANSLATIONS[text]);
      
      // Pattern-based translations first
      if (text.includes("邮件离开")) {
        const location = translateLocations(text.match(/【([^】]+)】/)?.[1] || "facility");
        return `Package departed from ${location}, en route to next station`;
      }
      if (text.includes("邮件到达")) {
        const location = translateLocations(text.match(/【([^】]+)】/)?.[1] || "facility");
        if (text.includes("准备发往")) {
          const dest = translateLocations(text.match(/准备发往【([^】]+)】/)?.[1] || "");
          return `Package arrived at ${location}, ready to dispatch to ${dest}`;
        }
        return `Package arrived at ${location}`;
      }
      if (text.includes("邮件已乘机")) {
        const locations = text.match(/【([^】]+)】/g)?.map(l => translateLocations(l.replace(/【|】/g, ""))) || [];
        return `Package on flight from ${locations[0] || "origin"} to ${locations[1] || "destination"}`;
      }
      if (text.includes("邮件已在")) {
        const location = translateLocations(text.match(/【([^】]+)】/)?.[1] || "facility");
        return `Package sorted at ${location}, ready for dispatch`;
      }
      
      // Partial matches - replace known terms
      let result = text;
      for (const [ch, en] of Object.entries(CHINESE_TRANSLATIONS)) {
        result = result.replace(new RegExp(ch, "g"), en);
      }
      
      // Translate any remaining location names
      result = translateLocations(result);
      
      return result;
    };

    const prompt = `Translate the following Chinese shipping/tracking status messages to English.
Output MUST be a plain JSON array of English strings in the same order, nothing else.
Do NOT include Chinese in the output. Do NOT include numbering. Do NOT include code fences.

Messages:
${textsToTranslate.map((t: { text: string }, i: number) => `${i + 1}. ${t.text}`).join("\n")}

Respond ONLY with a JSON array like:
["Arrived at destination", "Customs released", ...]`;

    const response = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": env.APP_URL,
        "X-Title": env.APP_NAME,
      },
      body: JSON.stringify({
        model: "mistralai/ministral-8b",
        messages: [
          { role: "system", content: "You are a translator specializing in shipping and logistics terminology. Translate accurately and concisely. Output only English." },
          { role: "user", content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "[]";
    console.log("AI translation raw response:", content);
    
    // Strip markdown fences if present
    content = content.replace(/```json/gi, "").replace(/```/g, "").trim();

    const hasChinese = (text: string) => /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);

    // Helper to call a simpler fallback prompt (one per line)
    const callFallbackTranslator = async () => {
      const fallbackPrompt = `Translate each of the following Chinese shipping status lines to English.
Return the translations as plain text, one per line, same order, English only. Do NOT include Chinese. Do NOT include numbering. Do NOT include code fences.

${textsToTranslate.map((t) => t.text).join("\n")}`;

      const fallbackRes = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": env.APP_URL,
          "X-Title": env.APP_NAME,
        },
        body: JSON.stringify({
          model: "mistralai/ministral-8b",
          messages: [
            { role: "system", content: "You are a concise translator for shipping statuses. Output English only, no Chinese." },
            { role: "user", content: fallbackPrompt }
          ],
          max_tokens: 1500,
          temperature: 0.2,
        }),
      });

      if (!fallbackRes.ok) return [];
      const fallbackData = await fallbackRes.json();
      let fallbackContent = fallbackData.choices?.[0]?.message?.content || "";
      // Some models put content in reasoning field
      if (!fallbackContent && fallbackData.choices?.[0]?.message?.reasoning) {
        fallbackContent = fallbackData.choices[0].message.reasoning;
      }
      console.log("Fallback translator content:", fallbackContent);
      fallbackContent = fallbackContent.replace(/```json/gi, "").replace(/```/g, "").trim();
      const lines = fallbackContent.split(/\n+/).map((l: string) => l.trim().replace(/^\d+\.\s*/, "")).filter(Boolean);
      console.log("Fallback translator lines:", lines);
      return lines;
    };
    // Parse translations with multiple fallbacks
    let translations: string[] = [];
    try {
      const match = content.match(/\[[\s\S]*?\]/);
      if (match) {
        translations = JSON.parse(match[0]);
        console.log("Parsed translations (json array):", translations);
      }
    } catch (parseError) {
      console.error("Failed to parse translations JSON:", content, parseError);
    }

    // Fallback: attempt to close incomplete JSON array
    if (translations.length === 0 && content.includes("[")) {
      const openBracket = content.indexOf("[");
      const closeBracket = content.lastIndexOf("]");
      const arrayText = closeBracket > openBracket ? content.slice(openBracket, closeBracket + 1) : content.slice(openBracket) + "]";
      try {
        translations = JSON.parse(arrayText);
        console.log("Parsed translations (fixed array):", translations);
      } catch {
        // ignore
      }
    }

    // Fallback: split by newline and strip numbering / bullets
    if (translations.length === 0) {
      const lines = content
        .split(/\n+/)
        .map((l: string) => l.trim().replace(/^\d+\.\s*/, "").replace(/^[-*]\s*/, ""))
        .filter(Boolean);
      if (lines.length > 0) {
        translations = lines;
        console.log("Parsed translations (fallback lines):", translations);
      }
    }

    // Fallback: extract quoted strings
    if (translations.length === 0) {
      const quoted: string[] = [];
      const regex = /"([^"]+)"/g;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(content)) !== null) {
        quoted.push(m[1]);
      }
      if (quoted.length > 0) {
        translations = quoted;
        console.log("Parsed translations (quoted strings):", translations);
      }
    }

    // Clean translations: remove placeholder "[]", empty strings
    translations = translations
      .map((t) => (typeof t === "string" ? t.trim() : ""))
      .filter((t) => t && t !== "[]");

    // If translations are missing or still contain Chinese, try fallback translator
    const needsFallback =
      translations.length === 0 ||
      translations.some((t) => hasChinese(t)) ||
      translations.length < textsToTranslate.length;

    if (needsFallback) {
      const fallbackLines = await callFallbackTranslator();
      if (fallbackLines.length > 0) {
        translations = fallbackLines.slice(0, textsToTranslate.length);
        console.log("Using fallback translator:", translations);
      }
    }

    // Final cleanup and padding
    translations = translations
      .map((t) => (typeof t === "string" ? t.trim() : ""))
      .filter((t) => t && !hasChinese(t));

    // Use hardcoded fallback for any missing or Chinese-containing translations
    if (translations.length < textsToTranslate.length || translations.some((t) => !t || hasChinese(t))) {
      console.log("Using hardcoded translation fallback");
      translations = textsToTranslate.map((t, idx) => {
        const aiTranslation = translations[idx];
        if (aiTranslation && !hasChinese(aiTranslation)) return aiTranslation;
        return translateWithFallback(t.text);
      });
      console.log("Hardcoded translations:", translations);
    }

    if (translations.length === 0) {
      console.log("No translations parsed");
      return NextResponse.json({ events, translated: false });
    }

    // Apply translations back to events
    let changed = false;
    const translatedEvents = events.map((event: { message: string; id?: string; timestamp?: string; status?: string; location?: string }, index: number) => {
      const translateEntry = textsToTranslate.find((t: { index: number }) => t.index === index);
      if (translateEntry) {
        const translationIndex = textsToTranslate.indexOf(translateEntry);
        // Allow partial translations
        const translatedText = translations[translationIndex] || translations[translations.length - 1] || translateEntry.text;
        if (translatedText) {
          console.log(`Translating event ${index}: "${event.message}" -> "${translations[translationIndex]}"`);
          if (translatedText !== event.message) {
            changed = true;
          }
          return {
            ...event,
            message: translatedText,
            originalMessage: event.message,
          };
        }
      }
      return event;
    });

    // Translate origin and destination if provided
    const translatedOrigin = origin ? translateLocations(origin) : undefined;
    const translatedDestination = destination ? translateLocations(destination) : undefined;

    console.log(`Returning ${translatedEvents.length} events, translated: ${changed}`);
    console.log(`Origin: ${origin} -> ${translatedOrigin}, Destination: ${destination} -> ${translatedDestination}`);
    return NextResponse.json({ 
      events: translatedEvents, 
      translated: changed,
      origin: translatedOrigin,
      destination: translatedDestination,
    });
  } catch (error) {
    console.error("Translate API error:", error);
    return NextResponse.json(
      { error: "Failed to translate" },
      { status: 500 }
    );
  }
}
