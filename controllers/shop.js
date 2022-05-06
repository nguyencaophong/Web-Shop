const fs = require('fs')
const path = require('path')

const PDFDocument = require('pdfkit')

const Product = require('../models/product')
const Order = require('../models/order')
const { populate, countDocuments } = require('../models/product')

const ITEMS_PER_PAGE = 6

exports.getProducts = async (req, res, next) => {
    const page = +req.query.page || 1
    let totalItems
    try {
        const totalProduct = await Product.find()
        const totalItems = totalProduct.length
        res.render('shop/product-list', {
            prods: totalProduct,
            pageTitle: 'Products',
            path: '/products',
            currentPage: page,
            hasNextPage: ITEMS_PER_PAGE * page < totalItems,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
        })
    } catch (error) {
        console.log(error)
    }
}

exports.getProduct = async (req, res, next) => {
    const prodId = req.params.productId
    try {
        const prodDetail = await Product.findById(prodId)

        res.render('shop/product-detail', {
            product: prodDetail,
            pageTitle: prodDetail.title,
            path: '/products'
        })
    } catch (error) {
        console.log(error)
    }
}

exports.getIndex = async (req, res, next) => {

    const page = +req.query.page || 1
    try {
        const totalProduct = await Product.find()
            .skip((page - 1) * ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE)

        const totalItems = await Product.find().countDocuments()

        res.render('shop/index', {
            prods: totalProduct,
            pageTitle: 'Shop',
            path: '/',
            currentPage: page,
            hasNextPage: ITEMS_PER_PAGE * page < totalItems,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
        })
    } catch (error) {
        console.log(error)
    }
}

exports.getCart = async (req, res, next) => {
    try {
        const getAllProduct = await req.user
            .populate('cart.items.productId')
            .execPopulate()

        const products = getAllProduct.cart.items
        res.render('shop/cart', {
            path: '/cart',
            pageTitle: 'Your Cart',
            products: products
        })
    } catch (error) {
        console.log(error)
    }
}

exports.postCart = async (req, res, next) => {
    const prodId = req.body.productId
    try {
        const productIdDetail = await Product.findById(prodId)

        const addProduct = await req.user.addToCart(productIdDetail)

        res.redirect('/cart')
    } catch (error) {
        console.log(error)
    }
}

exports.postCartDeleteProduct = async (req, res, next) => {
    const prodId = req.body.productId
    req.user
        .removeFromCart(prodId)
        .then((result) => {
            res.redirect('/cart')
        })
        .catch((err) => {
            const error = new Error(err)
            error.httpStatusCode = 500
            return next(error)
        })
}

exports.postOrder = async (req, res, next) => {
    console.log('POST ORDER')
    try {
        const orderProduct = await req.user
            .populate('cart.items.productId')
            .execPopulate()

        function fillterProduct(product) {
            return {
                quantity: product.quantity,
                product: {...product.productId._doc }
            }
        }
        const listProduct = orderProduct.cart.items.map(fillterProduct)

        const order = new Order({
            user: {
                email: req.user.email,
                userId: req.user
            },
            products: listProduct
        })

        await order.save()
        await req.user.clearCart()

        res.redirect('/orders')
    } catch (error) {
        console.log(error)
    }
}

exports.getOrders = async (req, res, next) => {
    try {
        const productOrder = await Order.find({ 'user.userId': req.user._id })
        res.render('shop/orders', {
            path: '/orders',
            pageTitle: 'Your Orders',
            orders: productOrder
        })
    } catch (error) {
        console.log(error)
    }
}

exports.getInvoice = async (req, res, next) => {
    try {
        const orderId = req.params.orderId

        const invoiceProduct = await Order.findById(orderId)

        if (!invoiceProduct) {
            return next(new Error('No order found.'))
        }
        if (invoiceProduct.user.userId.toString() !== req.user._id.toString()) {
            return next(new Error('Unauthorized'))
        }
        const invoiceName = 'invoice-' + orderId + '.pdf'
        const invoicePath = path.join('data', 'invoices', invoiceName)

        const pdfDoc = new PDFDocument()
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader(
            'Content-Disposition',
            'inline; filename="' + invoiceName + '"'
        )
        pdfDoc.pipe(fs.createWriteStream(invoicePath))
        pdfDoc.pipe(res)

        pdfDoc.fontSize(40).text('              Invoice')
        pdfDoc.text('-----------------------------------')
        let totalPrice = 0
        invoiceProduct.products.forEach((prod) => {
            totalPrice += prod.quantity * prod.product.price
            pdfDoc
                .fontSize(14)
                .text(
                    prod.product.title +
                        ' - ' +
                        prod.quantity +
                        ' x ' +
                        '$' +
                        prod.product.price
                )
        })
        pdfDoc.text('-------------------------------------')
        pdfDoc.fontSize(20).text('Total Price: $' + totalPrice)

        pdfDoc.end()
    } catch (error) {
        console.log(error)
    }
}
