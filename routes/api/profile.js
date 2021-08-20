const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const { validationResult, check } = require('express-validator');

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

module.exports = router;
