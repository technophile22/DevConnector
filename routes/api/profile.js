const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const { validationResult, check } = require('express-validator');
const request = require('request');
const config = require('config');

//@route    GET api/profile/me
//@desc     get current user profile
//@access   Private
router.get('/me', auth, async (req, res) => {
	try {
		const profile = await Profile.findOne({ user: req.user.id }).populate(
			'user',
			['name', 'avatar'],
		);

		if (!profile) {
			return res.status(400).json({ msg: 'User profile not found' });
		}

		res.json(profile);
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

//@route    Post api/profile/
//@desc     create or update user profile
//@access   Private
router.post(
	'/',
	[
		auth,
		[
			check('status', 'Status cannot be empty!').not().isEmpty(),
			check('skills', 'Skills cannot be empty!').not().isEmpty(),
		],
	],
	async (req, res) => {
		//check validation and send errors
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(500).json({ errors: errors.array() });
		}

		//destructure request
		const {
			company,
			website,
			location,
			bio,
			status,
			githubusername,
			skills,
			youtube,
			facebook,
			twitter,
			linkedin,
			instagram,
		} = req.body;

		//Build profile object
		const profileFields = {};

		profileFields.user = req.user.id;

		if (company) profileFields.company = company;
		if (website) profileFields.website = website;
		if (location) profileFields.location = location;
		if (bio) profileFields.bio = bio;
		if (status) profileFields.status = status;
		if (githubusername) profileFields.githubusername = githubusername;
		if (skills) {
			profileFields.skills = skills.split(',').map((skill) => skill.trim());
		}

		//build social object
		profileFields.social = {};
		if (youtube) profileFields.social.youtube = youtube;
		if (instagram) profileFields.social.instagram = instagram;
		if (twitter) profileFields.social.twitter = twitter;
		if (linkedin) profileFields.social.linkedin = linkedin;
		if (facebook) profileFields.social.facebook = facebook;

		try {
			let profile = await Profile.findOne({ user: req.user.id });
			if (profile) {
				//update
				profile = await Profile.findOneAndUpdate(
					{ user: req.user.id },
					{
						$set: profileFields,
					},
					{ new: true },
				);

				return res.json(profile);
			}

			//Create
			profile = new Profile(profileFields);
			await profile.save();
			return res.json(profile);
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	},
);

//@route    GET api/profile/
//@desc     get all profiles
//@access   public
router.get('/', async (req, res) => {
	try {
		const profiles = await Profile.find().populate('user', ['name', 'avatar']);
		res.json(profiles);
	} catch (err) {
		console.error(er.message);
		res.status(500).send('Server Error');
	}
});

//@route    GET api/profile/user/:user_id
//@desc     get profile by user id
//@access   public
router.get('/user/:user_id', async (req, res) => {
	try {
		const profile = await Profile.findOne({
			user: req.params.user_id,
		}).populate('user', ['name', 'avatar']);

		if (!profile)
			return res.status(400).json({ msg: 'User profile not found' });

		res.json(profile);
	} catch (err) {
		console.error(err.message);
		if (err.kind == 'ObjectId') {
			return res.status(400).json({ msg: 'User profile not found' });
		}
		res.status(500).send('Server Error');
	}
});

//@route    DELETE api/profile/
//@desc     delete profile, user and posts
//@access   private
router.delete('/', auth, async (req, res) => {
	try {
		//remove profile
		await Profile.findOneAndRemove({ user: req.user.id });

		//remove user
		await User.findOneAndRemove({ _id: req.user.id });

		//@todo - remove users posts

		res.json({ msg: 'User profile deleted successfully!' });
	} catch (err) {
		console.error(er.message);
		res.status(500).send('Server Error');
	}
});

//@route    PUT api/profile/experience
//@desc     add profile experience
//@access   private
router.put(
	'/experience',
	[
		auth,
		[
			check('title', 'Title is required').not().isEmpty(),
			check('company', 'Company is required').not().isEmpty(),
			check('from', 'From date is required').not().isEmpty(),
		],
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { title, company, location, from, to, current, description } =
			req.body;

		const newExp = {
			title,
			company,
			location,
			from,
			to,
			current,
			description,
		};

		try {
			const profile = await Profile.findOne({ user: req.user.id });

			//check if profile is there or not

			if (profile) {
				profile.experience.unshift(newExp);
				await profile.save();

				return res.json(profile);
			}

			return res.status(404).json({ msg: 'user not found!' });
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	},
);

//@route    DELETE api/profile/experience/:exp_id
//@desc     delete experience from profile
//@access   private
router.delete('/experience/:exp_id', auth, async (req, res) => {
	try {
		const profile = await Profile.findOne({ user: req.user.id });

		if (profile) {
			//get remove index
			const removeIndex = profile.experience
				.map((item) => item.id)
				.indexOf(req.params.exp_id);

			profile.experience.splice(removeIndex, 1);

			await profile.save();

			return res.json(profile);
		}
		return res.status(404).json({ msg: 'user not found!' });
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

//@route    PUT api/profile/education
//@desc     add profile education
//@access   private
router.put(
	'/education',
	[
		auth,
		[
			check('school', 'School is required').not().isEmpty(),
			check('degree', 'Degree is required').not().isEmpty(),
			check('fieldofstudy', 'Field of study is required').not().isEmpty(),
			check('from', 'From date is required').not().isEmpty(),
		],
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { school, degree, fieldofstudy, from, to, current, description } =
			req.body;

		const newEdu = {
			school,
			degree,
			fieldofstudy,
			from,
			to,
			current,
			description,
		};

		try {
			const profile = await Profile.findOne({ user: req.user.id });

			//check if profile is there or not

			if (profile) {
				profile.education.unshift(newEdu);
				await profile.save();

				return res.json(profile);
			}

			return res.status(404).json({ msg: 'user not found!' });
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	},
);

//@route    DELETE api/profile/education/:edu_id
//@desc     delete education from profile
//@access   private
router.delete('/education/:edu_id', auth, async (req, res) => {
	try {
		const profile = await Profile.findOne({ user: req.user.id });

		if (profile) {
			//get remove index
			const removeIndex = profile.education
				.map((item) => item.id)
				.indexOf(req.params.edu_id);

			profile.education.splice(removeIndex, 1);

			await profile.save();

			return res.json(profile);
		}
		return res.status(404).json({ msg: 'user not found!' });
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

//@route    GET api/profile/github/:username
//@desc     get user repos for GitHub
//@access   public
router.get('/github/:username', (req, res) => {
	try {
		const options = {
			uri: `https://api.github.com/users/${
				req.params.username
			}/repos?per_page=5&sort=created:asc&client_id=${config.get(
				'githubClientId',
			)}&client_secret=${config.get('githubSecret')}`,
			method: 'GET',
			headers: { 'user-agent': 'node.js' },
		};

		request(options, (error, response, body) => {
			if (error) console.error(error);

			if (response.statusCode !== 200) {
				return res.status(404).json({ msg: 'No GitHub profile found' });
			}

			res.json(JSON.parse(body));
		});
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

module.exports = router;
