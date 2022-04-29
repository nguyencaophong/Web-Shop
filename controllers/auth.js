const crypto = require('crypto')

const bcrypt = require('bcryptjs')
const nodemailer = require('nodemailer')
const sendgridTransport = require('nodemailer-sendgrid-transport')
const { validationResult } = require('express-validator/check')

const User = require('../models/user')

const transporter = nodemailer.createTransport(
    sendgridTransport({
        auth: {
            // eslint-disable-next-line no-undef
            api_key: process.env.TOKEN_SENDGRID,
        },
    })
)

exports.getLogin = (req, res, next) => {
    let message = req.flash('error')
    if (message.length > 0) {
        message = message[0]
    } else {
        message = null
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
    })
}

exports.getSignup = (req, res, next) => {
let message = req.flash('error')
    if (message.length > 0) {
        message = message[0]
    } else {
        message = null
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
    })
}

exports.postLogin = async (req, res, next) => {
    const email = req.body.email
    const password = req.body.password

    const errors = validationResult(req)
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
        })
    }

    try {
        const userLogin = await User.findOne({ email: email })
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
            })
        }

        const checkPassword = await bcrypt.compare(password, userLogin.password)
        const roleUser = userLogin.role

        if (checkPassword) {
            req.session.isLoggedIn = true
            req.session.user = userLogin
            await req.session.save()
            res.redirect('/')
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
            })
        }
    } catch (error) {
        console.log(error)
    }
}

exports.postSignup = async (req, res, next) => {
    const email = req.body.email
    const password = req.body.password
    const role = req.body.roleUser

    const roleArray = ['admin', 'user']
    const checkRoleValida = roleArray.includes(role)

    const errors = validationResult(req)
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
        })
    }

    if (checkRoleValida === false) {
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
        })
    }

    try {
        const bcryptPassword = await bcrypt.hash(password, 12)
        const user = new User({
            email: email,
            password: bcryptPassword,
            role: role,
            cart: { items: [] },
        })

        await user.save()
        // await transporter.sendMail({
        //   to:email,
        //   from: process.env.EMAIL_SENDGRID,
        //   subject: 'Singup successed!',
        //   html:'<h1>You successfully signed up!</h1>'
        // });
        res.redirect('/login')
    } catch (error) {
        console.log(error)
    }
}

exports.postLogout = (req, res, next) => {
    req.session.destroy((err) => {
        console.log(err)
        res.redirect('/')
    })
}

exports.getReset = (req, res, next) => {
    let message = req.flash('error')

    if (message.length > 0) {
        message = message[0]
    } else {
        message = null
    }
    try {
        res.render('auth/reset', {
            path: '/reset',
            pageTitle: 'Reset Password',
            errorMessage: message,
        })
    } catch (error) {
        console.log(error)
    }
}

exports.postReset = async (req, res, next) => {
    let token = ''
    const hashResetToken = crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err)
            res.redirect('/reset')
        }
        token = buffer.toString('hex')
    })
    try {
        const userDetail = await User.findOne({ email: req.body.email })
        if (!userDetail) {
            req.flash('error', 'No account with that email found.')
            res.redirect('/reset')
        }

        userDetail.resetToken = token
        userDetail.resetTokenExpiration = Date.now() + 3600000

        await userDetail.save()
        await transporter.sendMail({
            to: req.body.email,
            from: process.env.EMAIL_SENDGRID,
            subject: 'Password reset',
            html: `
                <p>You requested a password reset</p>
                <p>Click this <a href="http://localhost:5000/reset/${token}">link</a> to set a new password.</p>
              `,
        })
        console.log('Send email success!')

        res.redirect('/')
    } catch (error) {
        console.log(error)
    }
}

exports.getNewPassword = async (req, res, next) => {
    const token = req.params.token
    let message = req.flash('error')

    try {
        const userDetail = await User.findOne({
            resetToken: token,
            resetTokenExpiration: { $gt: Date.now() },
        })

        if (message.length > 0) {
            message = message[0]
        } else {
            message = null
        }
        res.render('auth/new-password', {
            path: '/new-password',
            pageTitle: 'New Password',
            errorMessage: message,
            userId: userDetail._id.toString(),
            passwordToken: token,
        })
    } catch (error) {
        console.log(error)
    }
}

exports.postNewPassword = async (req, res, next) => {
    const newPassword = req.body.password
    const userId = req.body.userId
    const passwordToken = req.body.passwordToken
    let resetUser

    try {
        const userDetail = await User.findOne({
            resetToken: passwordToken,
            resetTokenExpiration: { $gt: Date.now() },
            _id: userId,
        })

        resetUser = userDetail
        const hashedPassword = await bcrypt.hash(newPassword, 12)

        resetUser.password = hashedPassword
        resetUser.resetToken = undefined
        resetUser.resetTokenExpiration = undefined
        await resetUser.save()
        res.redirect('/login')
    } catch (error) {
        console.log(error)
    }
}
