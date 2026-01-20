import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { generateSummary, improveDescription, suggestSkills, optimizeForJob, atsScore, translateText } from '../services/aiService.js';

const router = Router();

router.post('/generate-summary', requireAuth, async (req, res, next) => {
  try { res.json({ summary: await generateSummary(req.body) }); }
  catch (err) { next(err); }
});

router.post('/improve-description', requireAuth, async (req, res, next) => {
  try { res.json({ text: await improveDescription(req.body) }); }
  catch (err) { next(err); }
});

router.post('/skills', requireAuth, async (req, res, next) => {
  try { res.json({ skills: await suggestSkills(req.body) }); }
  catch (err) { next(err); }
});

router.post('/optimize', requireAuth, async (req, res, next) => {
  try { res.json({ text: await optimizeForJob(req.body) }); }
  catch (err) { next(err); }
});

router.post('/ats-score', requireAuth, async (req, res, next) => {
  try { res.json(await atsScore(req.body)); }
  catch (err) { next(err); }
});

router.post('/translate', requireAuth, async (req, res, next) => {
  try { res.json({ text: await translateText(req.body) }); }
  catch (err) { next(err); }
});

router.post('/cover-letter', requireAuth, async (req, res, next) => {
  try {
    const { role = '', company = '', resumeSummary = '' } = req.body;
    const body = {
      jobTitle: role,
      experienceLevel: 'auto',
      industry: 'general',
      bullets: []
    };
    const summary = resumeSummary || await generateSummary(body);
    const text = `Dear Hiring Manager,\n\n${summary}\n\nI am excited to apply for the ${role} role at ${company}. I would welcome the opportunity to discuss how I can contribute.\n\nSincerely,\n[Your Name]`;
    res.json({ coverLetter: text });
  } catch (err) { next(err); }
});

export default router;
