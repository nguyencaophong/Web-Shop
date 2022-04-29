const path = require('path')

const express = require('express')
const { body } = require('express-validator/check')

const adminController = require('../controllers/admin')
const isAuth = require('../middleware/is-auth')
const checkRoleUser = require('../middleware/check-roleUser')

const router = express.Router()

// /admin/add-product => GET
router.get('/add-product', isAuth, checkRoleUser, adminController.getAddProduct)

// /admin/products => GET
router.get('/products', isAuth, checkRoleUser, adminController.getProducts)

// /admin/add-product => POST
router.post(
    '/add-product',
    [
        body('title').isString().isLength({ min: 3 }).trim(),
        body('price').isFloat(),
        body('description').isLength({ min: 5, max: 400 }).trim(),
    ],
    isAuth,
    checkRoleUser,
    adminController.postAddProduct
)

router.get(
    '/edit-product/:productId',
    isAuth,
    checkRoleUser,
    adminController.getEditProduct
)

router.post(
    '/edit-product',
    [
        body('title').isString().isLength({ min: 3 }).trim(),
        body('price').isFloat(),
        body('description').isLength({ min: 5, max: 400 }).trim(),
    ],
    isAuth,
    checkRoleUser,
    adminController.postEditProduct
)

router.delete(
    '/product/:productId',
    isAuth,
    checkRoleUser,
    adminController.deleteProduct
)

module.exports = router
