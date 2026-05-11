import { Router } from 'express';
import xss from 'xss';

import {
  createUser,
  authenticateUser,
  updateProfile,
  addZipToWatchList,
  getAllUsers,
  checkString,
  checkName,
  checkEmail,
  checkGender,
  checkAge,
  checkAddress,
  checkPassword,
  checkZipCode,
  adminUser,
  banUser,
  getUserById,
  removeUser
} from '../data/users.js';

const router = Router();

function cleanInput(val) {
  if (typeof val !== 'string') return val;
  return xss(val);
}

function cleanAddress(address) {
  if (!address || typeof address !== 'object' || Array.isArray(address)) return address;

  return {
    Street: cleanInput(address.Street),
    City: cleanInput(address.City),
    State: cleanInput(address.State),
    zipCode: cleanInput(address.zipCode)
  };
}

router.route('/').get(async (req, res) => {
  if (!req.session.user) {
    res.render('home', {
      title: 'Home',
      notLoggedIn: true
    });
    return;
  }

  res.render('home', {
    title: 'Home',
    loggedIn: true,
    isAdmin: req.session.user.role === 'admin',
    user: req.session.user
  });
});

router
  .route('/register')
  .get(async (req, res) => {
    if (req.session.user) {
      res.redirect('/');
      return;
    }

    res.render('register', { title: 'Register' });
  })
  .post(async (req, res) => {
    let formData = req.body;

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.gender || !formData.age || !formData.address || !formData.password || !formData.confirmPassword) {
      res.status(400).render('register', {
        title: 'Register',
        hasError: true,
        error: 'All fields must be supplied.'
      });
      return;
    }

    let firstName = '';
    let lastName = '';
    let email = '';
    let gender = '';
    let age = '';
    let address = {};
    let password = '';
    let confirmPassword = '';

    try {
      firstName = checkName(cleanInput(formData.firstName), 'firstName');
      lastName = checkName(cleanInput(formData.lastName), 'lastName');
      email = checkEmail(cleanInput(formData.email));
      gender = checkGender(cleanInput(formData.gender));
      age = checkAge(cleanInput(formData.age));
      address = checkAddress(cleanAddress(formData.address));
      password = checkPassword(cleanInput(formData.password));
      confirmPassword = checkString(cleanInput(formData.confirmPassword), 'confirmPassword');

      if (password !== confirmPassword) throw `password and confirmPassword must match.`;
    } catch (e) {
      res.status(400).render('register', {
        title: 'Register',
        hasError: true,
        error: e
      });
      return;
    }

    try {
      const result = await createUser(firstName, lastName, email, gender, age, address, password);

      if (result.userCreated === true) {
        res.redirect('/signin');
        return;
      }

      res.status(500).render('error', {
        title: 'Error',
        error: 'Internal Server Error'
      });
      return;
    } catch (e) {
      res.status(400).render('register', {
        title: 'Register',
        hasError: true,
        error: e
      });
      return;
    }
  });

router
  .route('/signin')
  .get(async (req, res) => {
    if (req.session.user) {
      res.redirect('/');
      return;
    }

    res.render('signin', { title: 'Sign In' });
  })
  .post(async (req, res) => {
    let formData = req.body;

    if (!formData.email || !formData.password) {
      res.status(400).render('signin', {
        title: 'Sign In',
        hasError: true,
        error: 'Both email and password must be supplied.'
      });
      return;
    }

    let email = '';
    let password = '';

    try {
      email = checkEmail(cleanInput(formData.email));
      password = checkPassword(cleanInput(formData.password));
    } catch (e) {
      res.status(400).render('signin', {
        title: 'Sign In',
        hasError: true,
        error: e
      });
      return;
    }

    try {
      const user = await authenticateUser(email, password);

      req.session.user = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        gender: user.gender,
        age: user.age,
        address: user.address,
        role: user.role,
        trustRating: user.trustRating,
        filedReports: user.filedReports,
        verifiedReports: user.verifiedReports,
        watchListZip: user.watchListZip,
        accountMade: user.accountMade
      };

      res.redirect('/');
      return;
    } catch (e) {
      res.status(400).render('signin', {
        title: 'Sign In',
        hasError: true,
        error: e
      });
      return;
    }
  });

router.route('/profile').get(async (req, res) => {
  if (!req.session.user) {
    res.redirect('/signin');
    return;
  }

  res.render('profile', {
    title: 'Profile',
    user: req.session.user
  });
});

router.route('/profile/update').post(async (req, res) => {
  if (!req.session.user) {
    res.redirect('/signin');
    return;
  }

  let formData = req.body;

  if (!formData.firstName || !formData.lastName || !formData.email || !formData.gender || !formData.age || !formData.address) {
    res.status(400).render('profile', {
      title: 'Profile',
      hasError: true,
      error: 'All fields must be supplied.',
      user: req.session.user
    });
    return;
  }

  let firstName = '';
  let lastName = '';
  let email = '';
  let gender = '';
  let age = '';
  let address = {};

  try {
    firstName = checkName(cleanInput(formData.firstName), 'firstName');
    lastName = checkName(cleanInput(formData.lastName), 'lastName');
    email = checkEmail(cleanInput(formData.email));
    gender = checkGender(cleanInput(formData.gender));
    age = checkAge(cleanInput(formData.age));
    address = checkAddress(cleanAddress(formData.address));
  } catch (e) {
    res.status(400).render('profile', {
      title: 'Profile',
      hasError: true,
      error: e,
      user: req.session.user
    });
    return;
  }

  try {
    const updatedUser = await updateProfile(
      req.session.user._id,
      firstName,
      lastName,
      email,
      gender,
      age,
      address
    );

    req.session.user = updatedUser;

    res.redirect('/profile');
    return;
  } catch (e) {
    res.status(400).render('profile', {
      title: 'Profile',
      hasError: true,
      error: e,
      user: req.session.user
    });
    return;
  }
});

router.route('/profile/watchlist/add').post(async (req, res) => {
  if (!req.session.user) {
    res.redirect('/signin');
    return;
  }

  let formData = req.body;

  if (!formData.zipCode) {
    res.status(400).render('profile', {
      title: 'Profile',
      hasError: true,
      error: 'zipCode must be supplied.',
      user: req.session.user
    });
    return;
  }

  let zipCode = '';

  try {
    zipCode = checkZipCode(cleanInput(formData.zipCode));
  } catch (e) {
    res.status(400).render('profile', {
      title: 'Profile',
      hasError: true,
      error: e,
      user: req.session.user
    });
    return;
  }

  try {
    const updatedUser = await addZipToWatchList(req.session.user._id, zipCode);
    req.session.user = updatedUser;

    res.json({
      profileUpdated: true,
      user: updatedUser
    });
    return;
  } catch (e) {
    res.status(400).render('profile', {
      title: 'Profile',
      hasError: true,
      error: e,
      user: req.session.user
    });
    return;
  }
});

router.route('/profile/delete').post(async (req, res) => {
  if (!req.session.user) {
    res.redirect('/signin');
    return;
  }

  try {
    await removeUser(req.session.user._id);

    req.session.destroy(() => {
      res.redirect('/signin');
    });

    return;
  } catch (e) {
    res.status(400).render('profile', {
      title: 'Profile',
      hasError: true,
      error: e,
      user: req.session.user
    });

    return;
  }
});

router.route('/admin/users').get(async (req, res) => {
  if (!req.session.user) {
    res.redirect('/signin');
    return;
  }

  if (req.session.user.role !== 'admin') {
    res.status(403).render('error', {
      title: 'Error',
      error: 'You do not have permission to view this page.'
    });
    return;
  }

  try {
    const userList = await getAllUsers();

    res.render('adminUsers', {
      title: 'Admin Users',
      users: userList
    });
    return;
  } catch (e) {
    res.status(500).render('error', {
      title: 'Error',
      error: e
    });
    return;
  }
});

router.route('/admin/users/:id').get(async (req, res) => {
  if (!req.session.user) {
    res.redirect('/signin');
    return;
  }

  if (req.session.user.role !== 'admin') {
    res.status(403).render('error', {
      title: 'Error',
      error: 'You do not have permission to view this page.'
    });
    return;
  }

  let userId = '';

  try {
    userId = checkString(cleanInput(req.params.id), 'userId');
    const selectedUser = await getUserById(userId);

    res.render('adminUserProfile', {
      title: 'Admin User Profile',
      selectedUser: selectedUser
    });
    return;
  } catch (e) {
    res.status(400).render('error', {
      title: 'Error',
      error: e
    });
    return;
  }
});

router.route('/admin/users/:id/upgrade').post(async (req, res) => {
  if (!req.session.user) {
    res.redirect('/signin');
    return;
  }

  if (req.session.user.role !== 'admin') {
    res.status(403).render('error', {
      title: 'Error',
      error: 'You do not have permission to do this.'
    });
    return;
  }

  try {
    const userId = checkString(cleanInput(req.params.id), 'userId');
    await adminUser(userId);

    res.redirect(`/admin/users/${userId}`);
    return;
  } catch (e) {
    res.status(400).render('error', {
      title: 'Error',
      error: e
    });
    return;
  }
});

router.route('/admin/users/:id/ban').post(async (req, res) => {
  if (!req.session.user) {
    res.redirect('/signin');
    return;
  }

  if (req.session.user.role !== 'admin') {
    res.status(403).render('error', {
      title: 'Error',
      error: 'You do not have permission to do this.'
    });
    return;
  }

  try {
    const userId = checkString(cleanInput(req.params.id), 'userId');
    await banUser(userId);

    res.redirect(`/admin/users/${userId}`);
    return;
  } catch (e) {
    res.status(400).render('error', {
      title: 'Error',
      error: e
    });
    return;
  }
});

router.route('/signout').get(async (req, res) => {
  if (!req.session.user) {
    res.redirect('/signin');
    return;
  }

  req.session.destroy(() => {
    res.render('signout', { title: 'Signed Out' });
  });
});

export default router;
