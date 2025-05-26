
const { S3Client } = require('@aws-sdk/client-s3');
// const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');const multerS3 = require('multer-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');

const Config = require('../config');


// Configure AWS SDK v3
const s3Client = new S3Client({
    region: 'eu-north-1', // e.g., 'us-west-2'
    credentials: {
        accessKeyId: Config.ACESSKEYID,
        secretAccessKey: Config.SECRETACCESSKEY,
    },
});

// const s3 = new AWS.S3();



const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: 'playpalimgs',
        //   acl: 'public-read', // Set permissions for the uploaded file
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            cb(null, file.originalname)
            // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            // cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    })
});

// const upload = multer({ storage: storage })

module.exports = upload;
