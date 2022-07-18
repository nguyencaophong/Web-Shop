const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const { validationResult } = require('express-validator/check');

const User = require('../models/user');

const transporter = nodemailer.createTransport(
    sendgridTransport({
        auth: {
            api_key: process.env.TOKEN_SENDGRID,
        },
    })
);

exports.getLogin = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: message,
        oldInput: {
            email: '',
            password: '',
        },
        validationErrors: [],
    });
};

exports.getSignup = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: message,
        oldInput: {
            email: '',
            password: '',
            confirmPassword: '',
        },
        validationErrors: [],
    });
};

exports.postLogin = async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password,
            },
            validationErrors: errors.array(),
        });
    }

    try {
        const userLogin = await User.findOne({ email: email });
        if (!userLogin) {
            return res.status(422).render('auth/login', {
                path: '/login',
                pageTitle: 'Login',
                errorMessage: 'Invalid email or password.',
                oldInput: {
                    email: email,
                    password: password,
                },
                validationErrors: [],
            });
        }

        const checkPassword = await bcrypt.compare(password, userLogin.password);
        const roleUser = userLogin.role;

        if (checkPassword) {
            req.session.isLoggedIn = true;
            req.session.user = userLogin;
            await req.session.save();
            res.redirect('/');
        } else {
            res.status(422).render('auth/login', {
                path: '/login',
                pageTitle: 'Login',
                errorMessage: 'Invalid email or password.',
                oldInput: {
                    email: email,
                    password: password,
                },
                validationErrors: [],
            });
        }
    } catch (error) {
        console.log(error);
    }
};

exports.postSignup = async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const role = req.body.roleUser;

    const roleArray = ['admin', 'user'];
    const checkRoleValida = roleArray.includes(role);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {

        return res.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password,
                confirmPassword: req.body.confirmPassword,
                roleUser: req.body.roleUser,
            },
            validationErrors: errors.array(),
        });
    }

    if (checkRoleValida == false) {
        return res.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: 'Quyền User không khả dụng',
            oldInput: {
                email: email,
                password: password,
                confirmPassword: req.body.confirmPassword,
                roleUser: req.body.roleUser,
            },
            validationErrors: errors.array(),
        });
    }

    try {
        const bcryptPassword = await bcrypt.hash(password, 12);
        const user = new User({
            email: email,
            password: bcryptPassword,
            role: role,
            cart: { items: [] },
        });

        await user.save();
        res.redirect('/login');
    } catch (error) {
        console.log(error);
    }
};

exports.postLogout = (req, res, next) => {
    req.session.destroy((err) => {
        console.log(err);
        res.redirect('/');
    });
};

exports.getReset = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset Password',
        errorMessage: message,
    });
};

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err);
            return res.redirect('/reset');
        }
        const token = buffer.toString('hex');
        User.findOne({ email: req.body.email })
            .then((user) => {
                if (!user) {
                    req.flash('error', 'No account with that email found.');
                    return res.redirect('/reset');
                }
                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 3600000;
                return user.save();
            })
            .then((result) => {
                res.redirect('/');
                transporter.sendMail({
                    to: req.body.email,
                    from: 'shop@node-complete.com',
                    subject: 'Password reset',
                    html: `
            <p>You requested a password reset</p>
            <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
          `,
                });
            })
            .catch((err) => {
                const error = new Error(err);
                error.httpStatusCode = 500;
                return next(error);
            });
    });
};

exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
        .then((user) => {
            let message = req.flash('error');
            if (message.length > 0) {
                message = message[0];
            } else {
                message = null;
            }
            res.render('auth/new-password', {
                path: '/new-password',
                pageTitle: 'New Password',
                errorMessage: message,
                userId: user._id.toString(),
                passwordToken: token,
            });
        })
        .catch((err) => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser;

    User.findOne({
        resetToken: passwordToken,
        resetTokenExpiration: { $gt: Date.now() },
        _id: userId,
    })
        .then((user) => {
            resetUser = user;
            return bcrypt.hash(newPassword, 12);
        })
        .then((hashedPassword) => {
            resetUser.password = hashedPassword;
            resetUser.resetToken = undefined;
            resetUser.resetTokenExpiration = undefined;
            return resetUser.save();
        })
        .then((result) => {
            res.redirect('/login');
        })
        .catch((err) => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};
