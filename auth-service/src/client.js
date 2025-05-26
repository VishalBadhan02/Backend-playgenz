const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.resolve(__dirname, '../protos/user.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const userProto = grpc.loadPackageDefinition(packageDefinition).user;

const client = new userProto.UserService(
    `0.0.0.0:${process.env.USER_SERVICE_URL || 5002}`,
    grpc.credentials.createInsecure()
);

const userClient = async (data) => {
    // Wrap the gRPC call in a promise
    const createUser = () => {
        return new Promise((resolve, reject) => {
            client.CreateUser(data, (error, response) => {
                if (error) {
                    console.error('Error:', error.message);
                    reject({ success: false, message: error.message });
                } else {
                    resolve({ success: true, response });
                }
            });
        });
    };

    try {
        const result = await createUser();
        return result;
    } catch (error) {
        console.error("Error in createUser:", error);
        return error;
    }
};


const getUser = async (data) => {
    // Wrap the gRPC call in a promise
    const getUser = () => {
        const requestData = { user_id: data };
        return new Promise((resolve, reject) => {
            client.GetUser(requestData, (error, response) => {
                if (error) {
                    console.error('Error:', error.message);
                    reject({ success: false, message: error.message });
                } else {
                    resolve({ success: true, response });
                }
            });
        });
    };

    try {
        const result = await getUser();
        return result;
    } catch (error) {
        console.error("Error in createUser:", error);
        return error;
    }
};

const UniqueUserName = async (data) => {
    // Wrap the gRPC call in a promise
    const CheckUser = () => {
        const requestData = { userName: data };
        return new Promise((resolve, reject) => {
            client.GetUserName(requestData, (error, response) => {
                if (error) {
                    console.error('Error:', error.message);
                    reject({ success: false, message: error.message });
                } else {
                    resolve({ success: true, response });
                }
            });
        });
    };

    try {
        const result = await CheckUser();
        return result;
    } catch (error) {
        console.error("Error in createUser:", error);
        return error;
    }
};

module.exports = { userClient, getUser, UniqueUserName };
