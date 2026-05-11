import { Router } from 'express';
import xss from 'xss';
import { getServicesByZip } from '../data/services.js';

const router = Router();

router.get('/services', async (req, res) => {
  if (!req.session.user) return res.redirect('/signin');

  const zip = xss((req.query.zip || req.session.user?.address?.zipCode || '').trim());

  if (!/^\d{5}$/.test(zip)) {
    return res.status(400).render('services', {
      title: 'Local Services',
      zip,
      hasError: true,
      error: 'Please enter a valid 5-digit ZIP code.'
    });
  }

  try {
    const services = await getServicesByZip(zip);
    res.render('services', { title: 'Local Services', zip, services });
  } catch (e) {
    console.error('[services] Error for ZIP', zip, ':', e);
    res.status(500).render('services', {
      title: 'Local Services',
      zip,
      hasError: true,
      error: typeof e === 'string' ? e : 'Could not load services. Please try again.'
    });
  }
});

export default router;
