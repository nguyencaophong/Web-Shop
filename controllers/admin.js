const mongoose = require('mongoose');

const fileHelper = require('../util/file');

const { validationResult } = require('express-validator/check');

const Product = require('../models/product');

exports.getAddProduct = (req, res) => {
    res.render('admin/edit-product', {
        pageTitle: 'Add Product',
        path: '/admin/add-product',
        editing: false,
        hasError: false,
        errorMessage: null,
        validationErrors: []
    });
};

exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const image = req.file;
    const price = req.body.price;
    const description = req.body.description;
    if (!image) {
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                price: price,
                description: description
            },
            errorMessage: 'Attached file is not an image.',
            validationErrors: []
        });
    }
    const errors = validationResult(req);

    if (!errors.isEmpty()) {

        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                price: price,
                description: description
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    }

    const imageUrl = image.path;

    const product = new Product({
    // _id: new mongoose.Types.ObjectId('5badf72403fd8b5be0366e81'),
        title: title,
        price: price,
        description: description,
        imageUrl: imageUrl,
        userId: req.user
    });
    product
        .save()
        .then(result => {

            console.log('Created Product');
            res.redirect('/admin/products');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit;
    if (!editMode) {
        return res.redirect('/');
    }
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            if (!product) {
                return res.redirect('/');
            }
            res.render('admin/edit-product', {
                pageTitle: 'Edit Product',
                path: '/admin/edit-product',
                editing: editMode,
                product: product,
                hasError: false,
                errorMessage: null,
                validationErrors: []
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postEditProduct =async (req, res, next) => {
    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedPrice = req.body.price;
    const image = req.file;
    const updatedDesc = req.body.description;

    console.log(image,'hello');
    if (!image) {
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/edit-product',
            editing: true,
            hasError: true,
            product: {
                title: updatedTitle,
                price: updatedPrice,
                description: updatedDesc
            },
            errorMessage: 'Attached file is not an image.',
            validationErrors: []
        });
    }
    const errors = validationResult(req);

    if (!errors.isEmpty()) {

        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/edit-product',
            editing: true,
            hasError: true,
            product: {
                title: updatedTitle,
                price: updatedPrice,
                description: updatedDesc
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    }

    const product = await Product.findById(prodId);
    if (image) {
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = image.path;
    }


        const productDetail = await Product.updateOne({_id:prodId},{
            title: updatedTitle,
                price: updatedPrice,
                description: updatedDesc,
                imageUrl: image.path
        }, function (err, docs) {
            if (err){
                console.log(err)
            }
            else{
                console.log("Updated success");
            }
        });
        res.redirect('/');
};

exports.getProducts = (req, res, next) => {
    Product.find({ userId: req.user._id })
        .then(products => {
        
            res.render('admin/products', {
                prods: products,
                pageTitle: 'Admin Products',
                path: '/admin/products'
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.deleteProduct =async (req, res, next) => {
    try {
        const productId = req.params.productId;
        await Product.deleteOne({_id: productId});
        res.redirect(`/admin/products`);
        console.log('DELETE PRODUCT SUCCESS!!!');
    } catch (error) {
        console.log(error);
    }

};
