const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const User = require('../../models/User');

//@route    POST api/users
//@desc     Register user route
//@access   Public
router.post(
	'/',
	[
		check('name', 'Name is required').not().isEmpty(),
		check('email', 'Please include a valid email address').isEmail(),
		check(
			'password',
			'Please enter a passwod with 6 or more characters',
		).isLength({
			min: 6,
		}),
	],
	async (req, res) => {
		//check request validation
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { name, email, password } = req.body;

		try {
			//see if the user exists
			let user = await User.findOne({ email });
			if (user) {
				return res.status(400).json({
					errors: [{ msg: 'User already exists' }],
				});
			}

			// get users gravatar(based on email)
			const avatar = gravatar.url(email, {
				s: '200', //size
				r: 'pg', //rating
				d: 'mm', //default
			});

			//create new user
			user = new User({
				name,
				email,
				avatar,
				password,
			});

			//encrypt password
			const salt = await bcrypt.genSalt(10);
			user.password = await bcrypt.hash(password, salt);

			//save user
			await user.save();

			//return json web token
			const payload = {
				user: {
					id: user.id,
				},
			};

			jwt.sign(
				payload,
				config.get('jwtSecret'),
				{ expiresIn: 360000 },
				(err, token) => {
					if (err) throw err;
					res.json({ token });
				},
			);
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server error');
		}
	},
);

module.exports = router;
