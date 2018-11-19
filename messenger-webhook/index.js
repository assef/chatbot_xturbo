'use strict';

//var elite_api = require("../elite-api/integracao.js");

//Importa as dependencias e seta o servidor http

const
    express = require('express'),
    bodyParser = require('body-parser'),
    request = require('request'),
    app = express().use(bodyParser.json()); //Cria o servidor http

    //Token pagina Facebook
    let PAGE_ACCESS_TOKEN="EAAHpjBHZBx2kBAPIMZAE4Riw6VeMxlhWIGT3LAYPSoZAt3k34mZBN4apj9ZAZCyZCc28cZByKAOYKKWWrkz5WZC5dxaaYcJSgZApbaNOKZAQx02DcYDcJUFs0ORlZBwOSZAvoRUbd6AuD3qZAxeWiM318RHXmc8qCnacl3XrbWZCerQ57SBDKywYccddIAB";
    
//Seta porta do servidor e loga sucesso na console

app.listen(process.env.PORT || 1337, () => console.log('Webhook listening...'));

//Recebe a analisa eventos POST do Webhook

app.post('/webhook', (req, res) => {
    
    let body = req.body;
    
    //Checa o evento
    
    if (body.object === 'page') {
    
        body.entry.forEach(function(entry) {
            
            //Coleta o body do evento no webhook
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);
            
            //Coleta o PSID do usuario
            let sender_psid = webhook_event.sender.id;
            console.log('Sender PSID: ' + sender_psid);
            
            //Verifica se o evento é mensagem ou postback e chama a função adequada
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }
        });
        
        //Retorna codigo 200 Ok para todos os eventos
        
        res.status(200).send('EVENT_RECEIVED');
        
    } else {
        
        //Retornar erro 404 se o evento não estiver correto
        res.sendStatus(404);
        
    }
});

//Adiciona suporte ao GET no Webhook

app.get('/webhook', (req, res) => {
    
    //Codigo de verificacao
    let VERIFY_TOKEN="car0jg4la4";
    
    //Analisa os parametros da query
    
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
    
    //Checa o token na query
    
    if (mode && token) {
        
        //Checa o token e o modo
        
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            
            //Responde com uma challenge e loga o webhook como verificado
            console.log('Webhook verificado');
            res.status(200).send(challenge);
        
        } else {
            //Em caso de erro, responde 403 Forbidden, e loga erro de autenticação.
            console.log('Falha de autenticação do Webhook');
            res.status(403);
        }
    }
});


//Tratamento de eventos

function handleMessage(sender_psid, received_message) {
    
    let response;
    
    //Verificar se a mensagem possui texto
    if (received_message.text) {
        response = {
            "text": 'Mensagem recebida'
        };
    } else if (received_message.attachments) {
        
        //Caso a mensagem seja um anexo, coleta a URL do anexo
        let attachment_url = received_message.attachments[0].payload.url;
        
        response = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [{
                        "title": "Confira a imagem...",
                        "subtitle": "Toque no botão para responder...",
                        "image_url": attachment_url,
                        "buttons": [
                            {
                                "type": "postback",
                                "title": "Sim",
                                "payload": "sim",
                            },
                            {
                                "type": "postback",
                                "title": "Não",
                                "payload": "nao",
                            }
                            ],
                    }]
                }
            }
        };
    }
    
    //Chama a API de envio, e envia a mensagem
    callSendAPI(sender_psid, response);
    
}

//Tratamento de postback

function handlePostback(sender_psid, received_postback) {
    
    let response;
    
    //Coleta o payload para o postback
    let payload = received_postback.payload;
    
    //Responde de acordo com o payload
    if (payload === 'sim') {
        response = {"text": "Obrigado"};
    } else if (payload === 'nao') {
        response = {"text": "Desculpe, se quiser podemos tentar novamente"};
        console.log("Possivel erro na coleta do anexo...");
    }
    
    //Envia o texto para o cliente de acordo com o a resposta dele
    callSendAPI(sender_psid, response);
}

//Envia resposta usando a API de envio

function callSendAPI(sender_psid, response) {

    //Estrutura da mensagem
    
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    };
    
    //Envia um request HTTP para a plataforma do Messenger
    request({
        "uri": "https://graph.facebook.com/v2.6/me/messages",
        "qs": { "access_token": PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        if (!err) {
            console.log("Mensagem enviada...");
        } else {
            console.error("Falha ao envia a mensagem: " + err);
        }
    });
}