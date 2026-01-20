import OpenAI from 'openai';

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const useMock = !client;

export async function generateSummary({ jobTitle = '', experienceLevel = '', industry = '', bullets = [], tone = 'Professional' }) {
  if (useMock) {
    const starters = [
      'Results-driven', 'Detail-oriented', 'Impact-focused', 'Customer-centric', 'Innovative', 'Data-driven'
    ];
    const closers = [
      'Passionate about delivering measurable business outcomes.',
      'Known for high ownership and clear communication.',
      'Skilled at collaborating across functions to ship quality work.',
      'Committed to continuous improvement and best practices.'
    ];
    const s = starters[Math.floor(Math.random()*starters.length)];
    const c = closers[Math.floor(Math.random()*closers.length)];
    const jt = jobTitle || 'professional';
    const lvl = experienceLevel || 'solid';
    const ind = industry || 'the industry';
    return `${s} ${jt} with ${lvl} experience in ${ind}. Adept at turning requirements into outcomes with clear metrics. ${c}`;
  }
  const prompt = `You are an expert resume writer. Write a concise, 3-4 sentence, ATS-friendly professional summary tailored to:\nRole: ${jobTitle}\nExperience level: ${experienceLevel}\nIndustry: ${industry}\nIf helpful, weave in these highlights: ${bullets.slice(0,5).join('; ')}\nTone: ${tone}. Be specific and quantified where possible. Avoid generic buzzwords. No emojis. No greeting.`;
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You create concise ATS-friendly resume content.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 180
  });
  return res.choices?.[0]?.message?.content?.trim() || '';
}

export async function optimizeForJob({ resumeText = '', jobDescription = '', tone = 'Professional' }) {
  if (useMock) return `Optimized resume for JD: ${jobDescription.slice(0,80)}...`;
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Optimize resumes to be ATS-aligned and tailored to a given JD, preserving truthfulness.' },
      { role: 'user', content: `Job Description:\n${jobDescription}\n\nCurrent Resume:\n${resumeText}\n\nRewrite key sections to better match the JD while remaining accurate. Tone: ${tone}.` }
    ],
    temperature: 0.6,
    max_tokens: 600
  });
  return res.choices?.[0]?.message?.content?.trim() || '';
}

export async function atsScore({ resumeText = '', jobDescription = '' }) {
  if (useMock) return { score: 72, reasons: ['Good keyword match', 'Missing certifications'] };
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Evaluate ATS match between a resume and a job description. Return a JSON with score and reasons.' },
      { role: 'user', content: `JD:\n${jobDescription}\n\nResume:\n${resumeText}\n\nScore 0-100 and list 3-5 concise reasons. Respond as JSON {"score": number, "reasons": string[]}.` }
    ],
    temperature: 0.2,
    max_tokens: 200
  });
  try { return JSON.parse(res.choices?.[0]?.message?.content || '{}'); } catch { return { score: 0, reasons: [] }; }
}

export async function translateText({ text = '', target = 'en' }) {
  if (useMock) return text;
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Translate resume content accurately while preserving professional tone.' },
      { role: 'user', content: `Translate to ${target}: ${text}` }
    ],
    temperature: 0.2,
    max_tokens: 400
  });
  return res.choices?.[0]?.message?.content?.trim() || '';
}

export async function improveDescription({ text = '', role = '' }) {
  if (useMock) return `Improved: ${text}`;
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Rewrite resume bullets to be outcome-focused, quantified, and ATS-aligned.' },
      { role: 'user', content: `Rewrite and improve this for a ${role}: ${text}` }
    ],
    temperature: 0.6,
    max_tokens: 180
  });
  return res.choices?.[0]?.message?.content?.trim() || '';
}

export async function suggestSkills({ jobTitle = '', industry = '' }) {
  if (useMock) return ['Communication', 'Teamwork', 'Problem Solving'];
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'List core hard skills for the role, comma separated.' },
      { role: 'user', content: `List 10-15 core skills for a ${jobTitle} in ${industry}.` }
    ],
    temperature: 0.4,
    max_tokens: 120
  });
  const text = res.choices?.[0]?.message?.content || '';
  return text.split(/,|\n/).map(s => s.trim()).filter(Boolean);
}
