const mongoose = require('mongoose');

const fileHelper = require('../util/file');

const { validationResult } = require('express-validator/check');

const Product = require('../models/product');

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: []
  });
};

exports.postAddProduct =async (req, res, next) => {
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
  // use package express-validator/check npm
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors.array());
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
      validationErrors: errors.array()
    });
  }

  const imageUrl = image.path;

  const product = new Product({

    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user
  });
  try {
    const saveProduct =await product.save();

    console.log('Created Product');
    res.redirect('/admin/products');
  } catch (error) {
    console.log(error)
  }

};


exports.getEditProduct =async (req, res, next) => {
  const editMode = req.query.edit;
  if (editMode!='true') {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  try {
    const productDetail =await Product.findById(prodId)
    
    if(!productDetail){
      return res.redirect('/');
    }
    res.render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: editMode,
      product: productDetail,
      hasError: false,
      errorMessage: null,
      validationErrors: []
    });

  } catch (error) {
    console.log(error);
  }
 
};


exports.postEditProduct =async (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }
  
  try {
    const productDetail =await Product.findById(prodId);
    if(productDetail.userId.toString() !== req.user._id.toString()){
      return res.redirect('/');
    }
    productDetail.title = updatedTitle;
    productDetail.price = updatedPrice;
    productDetail.description = updatedDesc;
      if (image) {
        fileHelper.deleteFile(productDetail.imageUrl);
        productDetail.imageUrl = image.path;
      }
    const awaitSaveProduct =await  productDetail.save();

    console.log('UPDATED PRODUCT!');
    res.redirect('/admin/products');

    
  } catch (error) {
    console.log(error);
  }

};

exports.getProducts = (req, res, next) => {
  Product.find({ userId: req.user._id })
    .then(products => {
      // console.log(products);
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products'
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return next(new Error('Product not found.'));
      }
      fileHelper.deleteFile(product.imageUrl);
      return Product.deleteOne({ _id: prodId, userId: req.user._id });
    })
    .then(() => {
      console.log('DESTROYED PRODUCT');
      res.status(200).json({ message: 'Success!' });
    })
    .catch(err => {
      res.status(500).json({ message: 'Deleting product failed.' });
    });
};
