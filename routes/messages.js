'use strict';
const router = require('express').Router();

const WhatsappCloudAPI = require('whatsappcloudapi_wrapper');

const Whatsapp = new WhatsappCloudAPI({
    accessToken: process.env.Meta_WA_accessToken,
    senderPhoneNumberId: process.env.Meta_WA_SenderPhoneNumberId,
    WABA_ID: process.env.Meta_WA_wabaId,
});

const supabase= require( "@supabase/supabase-js").createClient(process.env.supabaseUrl, process.env.Api_Key);

const getData = (data) => {
    const categorizedData = data.reduce((acc, curr) => {
      const {
        id,
        category,
        created_at,
        observation,
        dispatch_option,
        menu_item,
        modifiers,
        quantity,
        preferences,
        amount,
        general_status
      } = curr;
      if (!acc[id]) {
        acc[id] = {
          products: [],
          id: id,
          created_at: created_at,
          dispatch_option: dispatch_option,
          observation: observation,
          preferences:preferences,
          amount: amount,
          general_status: general_status
        };
      }
      acc[id].products.push({
        category: category,
        menu_item: menu_item,
        modifiers: modifiers,
        quantity: quantity,
      });

      return acc;
    }, {});
    return categorizedData;
  };

  const formatPrice = (price) => {
    const priceFormated = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      style: "currency",
      currency: "USD",
      currencyDisplay: "narrowSymbol",
    }).format(parseFloat(price));
  
    return priceFormated;
}

router.get('/meta_wa_callbackurl', async(req, res) => {
    try {
        console.log('GET: Someone is pinging me!');
        let mode = req.query['hub.mode'];
        let token = req.query['hub.verify_token'];
        let challenge = req.query['hub.challenge'];

        if (
            mode &&
            token &&
            mode === 'subscribe' &&
            process.env.Meta_WA_VerifyToken === token
        ) {
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    } catch (error) {
        console.error({ error });
        return res.sendStatus(500);
    }
});

router.post('/meta_wa_callbackurl', async (req, res) => {
    console.log('POST: Someone is pinging me!');
    try {
        const dataW = Whatsapp.parseMessage(req.body);
        
        if (dataW?.isMessage) {
            let incomingMessage = dataW.message;

            let recipientPhone = incomingMessage.from.phone; // extract the phone number of sender
            let recipientName = incomingMessage.from.name;
            let typeOfMsg = incomingMessage.type; // extract the type of message (some are text, others are images, others are responses to buttons etc...)
            let message_id = incomingMessage.message_id; // extract the message id
            let message_text = incomingMessage.text;
            const business = await supabase.from("business").select().eq('id', req.query.bid);

            if (typeOfMsg === 'text_message') {
               let messageText = message_text.body.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    if(isNaN(messageText)){
                        await Whatsapp.sendSimpleButtons({
                            message: `Hola ${recipientName}, \nBienvenido a ${business.data[0].name}`,
                            recipientPhone: recipientPhone,
                            listOfButtons: [
                                {
                                    title: 'Menu',
                                    id: 'menu',
                                },
                                {
                                    title: 'Consultar Orden',
                                    id: 'order',
                                },
                            ],
                        });
                    }else{
                        const { data} = await supabase.from("check_order_view").select().eq('id', messageText).eq('customer_phone', recipientPhone) ;
                        if(data.length === 0){
                            await Whatsapp.sendText({
                                recipientPhone: recipientPhone,
                                message: 'La orden no existe',
                            });
                        }else{
                            const dateFormat = new Date(data[0].created_at);
                            let Text = '';
                            Text = `*Orden #${data[0].id}*\n\n`;
                            Text += `Detalles de la orden:\n`;
                            Text += `Fecha: ${dateFormat.getDate()}/${dateFormat.getMonth() + 1}/${dateFormat.getFullYear()}\n`;
                            Text += `Despacho: ${data[0].dispatch_option === "pickup" ? "Pickup" : data[0].dispatch_option === "delivery" ? "Delivery": "For Service"}\n`;
                            Text += `Estatus: ${data[0].general_status ==="in_progress" ? "IN PROGRESS" : data[0].general_status.toUpperCase()}\n\n`;
                            Text += `Monto: ${formatPrice(data[0].amount)}`;
                            await Whatsapp.sendText({
                                recipientPhone: recipientPhone,
                                message: Text,
                            });
                        }
                        
                    }
                
            }

            if (typeOfMsg === 'simple_button_message') {
                let button_id = incomingMessage.button_reply.id;

                if (button_id === 'menu') {
                    
                    await Whatsapp.sendText({
                        recipientPhone: recipientPhone,
                        message: `Aqui puedes encontrar nuestro menu: `,
                    });

                    await Whatsapp.sendText({
                        recipientPhone: recipientPhone,
                        message: `https://dev.dxxem1xuex6ty.amplifyapp.com/piroz-pizza/`,
                    });

                }


                if (button_id === 'order') {
                    await Whatsapp.sendSimpleButtons({
                            message: `Hola ${recipientName}, \nPara consultar tu orden puedes hacerlo de la siguiente manera`,
                            recipientPhone: recipientPhone,
                            listOfButtons: [
                                {
                                    title: 'Nro de telefono',
                                    id: 'phone',
                                },
                                {
                                    title: 'Numero de pedido',
                                    id: 'pedido',
                                }
                            ],
                    });
                }


                if (button_id === 'phone') {
                    const { data} = await supabase.from("check_order_view").select().eq('customer_phone', recipientPhone)  ;
                    const dataFilter = getData(data)
                    let Text = '';
                    Object.values(dataFilter).map(async (item,index) => {
                        const dateFormat = new Date(item.created_at);
                        
                        Text += `*Orden #${item.id}*\n\n`;
                        Text += `Detalles de la orden:\n`;
                        Text += `Fecha: ${dateFormat.getDate()}/${dateFormat.getMonth() + 1}/${dateFormat.getFullYear()}\n`;
                        Text += `Despacho: ${item.dispatch_option === "pickup" ? "Pickup" : item.dispatch_option === "delivery" ? "Delivery": "For Service"}\n`;
                        Text += `Estatus: ${item.general_status ==="in_progress" ? "IN PROGRESS" : item.general_status.toUpperCase()}\n\n`;
                        Text += `Monto: ${formatPrice(item.amount)}\n\n`;
                    });
                    await Whatsapp.sendText({
                        recipientPhone: recipientPhone,
                        message: Text,
                    });
                    
                }

                if (button_id === 'pedido') {

                    await Whatsapp.sendText({
                        recipientPhone: recipientPhone,
                        message: `Por favor ingresa el numero de pedido recuerda que este debe ser solo numeros y no debe contener espacios `,
                    });

                }

            }

            await Whatsapp.markMessageAsRead({
                message_id,
            });
        }

        return res.sendStatus(200);
    } catch (error) {
        console.error({ error });
        return res.sendStatus(500);
    }
});

module.exports = router;
