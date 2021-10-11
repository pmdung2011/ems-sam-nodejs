const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
let response

exports.getLeaveHandler = async (event, context) => {
  console.log('Received Get Leave Event:', JSON.stringify(event, null, 2))

  let employee_id = event.requestContext.authorizer.id
  console.log('Received Caller ID = ', employee_id)

  const leaves = await prisma.pto.findMany({
    where: { employee_id: parseInt(employee_id), is_deleted: false },
    include: {
      pto_status: {
        select: {
          status_name: true,
        },
      },
    },
  })

  const result = leaves.map(leave => {
    return {
      ...fnToLeaveModel(leave),
      status: leave.pto_status.status_name,
    }
  })

  console.log('Get Leave Result:', JSON.stringify(result, null, 2))
  return generateResponse(
    200,
    'Leaves Retrieved for Employee ID = ' + employee_id,
    result
  )
}

exports.addLeaveHandler = async (event, context) => {
  console.log('Received Add Leave Event:', JSON.stringify(event, null, 2))

  let body = JSON.parse(event.body)
  console.log('Add Leave Event Body:', JSON.stringify(body, null, 2))
  let date = body.date
  let reason = body.reason

  let employee_id = event.requestContext.authorizer.id
  console.log('Received Caller ID = ', employee_id)

  let leave

  let today = new Date()
  let selectedDate = new Date(date)

  console.log('Selected date: ', selectedDate)
  console.log('Current date: ', today)
  console.log('Is selectedDate < today : ', selectedDate < today)

  if (selectedDate < today || !date || !reason) {
    console.log(`${selectedDate} is smaller than ${today}`)
    return generateResponse(400, 'Invalid selected date.', {})
  }

  try {
    const exist = await prisma.pto.findFirst({
      where: { employee_id: parseInt(employee_id), pto_date: new Date(date) },
    })

    if (exist) {
      throw new Error()
    }
  } catch (err) {
    console.log('Leave date exists error: ', err)
    return generateResponse(400, 'Leave date already exists', {})
  }

  try {
    leave = await prisma.pto.create({
      data: {
        employee_id: parseInt(employee_id),
        pto_date: new Date(date),
        reason: reason,
        status_id: 1,
      },
    })
  } catch (err) {
    console.log('Error while adding leave: ', err)
    return generateResponse(400, 'Invalid employeeID or date', {})
  }
  return generateResponse(200, 'Leave Added', fnToLeaveModel(leave))
}

exports.updateLeaveHandler = async (event, context) => {
  console.log('Received Modify Leave Event:', JSON.stringify(event, null, 2))

  let today = new Date()
  let newDate = new Date(event.pathParameters.date)
  console.log('Today date: ', today)
  console.log('New Leave date: ', newDate)

  let body = JSON.parse(event.body)
  console.log('Add Leave Event Body:', JSON.stringify(body, null, 2))
  let date = new Date(body.date)
  let reason = body.reason

  let employee_id = event.requestContext.authorizer.id
  console.log('Received Caller ID = ', employee_id)

  let updatedLeave
  console.log('Old Date: ', date)

  console.log('Is newDate < today : ', newDate < today)

  if (newDate < today || !date || !reason) {
    console.log('Invalid new date')
    return generateResponse(400, 'Invalid new date.', {})
  }

  try {
    const exist = await prisma.pto.findFirst({
      where: {
        employee_id: parseInt(employee_id),
        pto_date: date,
        status_id: 1,
      },
    })

    if (!exist) {
      throw new Error()
    }
  } catch (err) {
    console.log(err)
    console.log('Error while finding current existing leave')
    return generateResponse(400, 'Invalid selection - Leave not found', {})
  }

  try {
    updatedLeave = await prisma.pto.updateMany({
      where: {
        employee_id: parseInt(employee_id),
        pto_date: new Date(date),
      },
      data: {
        pto_date: newDate,
        reason: reason,
      },
    })
  } catch (err) {
    console.log('Error while updating leave: ', err)
    return generateResponse(400, 'Error while updating leave', {})
  }

  response = generateResponse(200, 'Leave Updated', updatedLeave)
  return response
}

function fnToISOString(date) {
  return new Date(date).toISOString().split('T')[0]
}

function fnToLeaveModel(leaveObject) {
  return {
    leaveId: leaveObject.id,
    employeeId: leaveObject.employee_id,
    date: fnToISOString(leaveObject.pto_date),
    reason: leaveObject.reason,
  }
}

function generateResponse(code, message, data) {
  let response
  response = {
    statusCode: code,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Headers': 'Authorization, *',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT',
      'Access-Control-Expose-Headers': 'Date, x-api-id',
      'Access-Control-Allow-Credentials': true,
      'X-Requested-With': '*',
    },
    body: JSON.stringify({
      message: message,
      data: data,
    }),
  }
  return response
}
