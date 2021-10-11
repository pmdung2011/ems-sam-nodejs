const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()


exports.handler = function verifyAccessToken(event, context, callback) {
    console.log('Received Authorizer event:', JSON.stringify(event, null, 2));
    console.log("Event Method ARN: ", event.methodArn);
    const authHeader = event.headers['Authorization']
        // console.log("AuthHeader: " + authHeader)
    const token = authHeader && authHeader.split(' ')[1]
        // console.log("Token: " + token)
    const secret = 'KV*S5wxj$XupxzG=VtCLpYVkDEsN#j8uGx%Hw*PRJU-d=LWZPMc-enVJmW7_v?P5eMQMhqB39hk82dVp5PpZGTT=R8j#=zpBaHvcvLF+4wQ7xthZWry84v=7YJ77-gGm'
    var methodArn = event.methodArn.split('/')[0] + "/*/*"
    console.log("New Method ARN: ", methodArn);

    jwt.verify(token, secret, async(err, decoded) => {
        if (err) {
            console.log("JWT VERIFY ERROR: " + err)
            callback("Unauthorized");

        } else {
            const { sub: email } = decoded
            const { id } = await prisma.employee.findFirst({
                where: { email },
                select: {
                    id: true,
                },
            })
            console.log("User ID  = " + id);
            callback(null, generateAllow('me', methodArn, id))
        }
    })

}

// Helper function to generate an IAM policy
var generatePolicy = function(principalId, effect, resource, id) {
    // Required output:
    var authResponse = {};
    authResponse.principalId = principalId;
    if (effect && resource) {
        var policyDocument = {};
        policyDocument.Version = '2012-10-17'; // default version
        policyDocument.Statement = [];
        var statementOne = {};
        statementOne.Action = 'execute-api:Invoke'; // default action
        statementOne.Effect = effect;
        statementOne.Resource = resource;
        policyDocument.Statement[0] = statementOne;
        authResponse.policyDocument = policyDocument;
    }
    // Optional output with custom properties of the String, Number or Boolean type.
    authResponse.context = {
        "id": id
    };
    console.log("Policy Document: ", JSON.stringify(authResponse, null, 2));
    return authResponse;
}

var generateAllow = function(principalId, resource, callerEmpId) {
    return generatePolicy(principalId, 'Allow', resource, callerEmpId);
}