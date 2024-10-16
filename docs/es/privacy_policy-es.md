## Zingo: Una Aplicación de Zcash

Utiliza la criptografía de conocimiento cero para realizar transacciones y gestionar tu historial de transacciones de forma privada y consciente.

Toma el control exclusivo y único de tu historial financiero. Utiliza esta visión única de tu propio comportamiento financiero para reflexionar sobre cómo gastas el dinero. Comparte información según tus propios términos. Establece relaciones saludables con diversas comunidades económicas.

¡Solo tú tienes el poder de compartir tu información! Tu perspectiva importa. Tú importas.

Cuando envías Zcash, puedes escribir un memo que contenga lo que quieras. Cuando recibes Zcash, también recibes el memo que el remitente escribió. Al igual que con la mayoría de las criptomonedas, las billeteras envían rutinariamente transacciones a sí mismas para recuperar el "cambio" de la transacción. En este caso, donde la aplicación es tanto el remitente como el receptor, Zingo utiliza el sistema de memos para escribir notas a sí misma sobre las transacciones que crea para el usuario.

Zingo extrae esos datos para proporcionarte información exclusiva. En nuestra versión inicial, ya utilizamos este mecanismo introspectivo para "recordar" a qué Direcciones Unificadas completas has enviado Zcash previamente. En otras palabras, Zingo realiza un seguimiento de a quién le has enviado Zcash, en la cadena de bloques. Esta "Libreta de Direcciones" de personas a las que has "Enviado" en el pasado es completamente privada y, siempre que protejas adecuadamente tu frase semilla, se recuperará por completo incluso si pierdes tu dispositivo.

Actualmente estamos implementando otro uso de estos memos en cadena, que te permitirá realizar un seguimiento (incluso si pierdes tu dispositivo) de qué direcciones generaste previamente para recibir fondos. Es decir, siempre tendrás una lista completa de todas las direcciones que le pediste a la gente que usara para enviarte Zcash.

En conjunto, estos dos mecanismos introspectivos te brindan información sobre a quién le has enviado fondos y a quién le has pedido fondos. ¡Esto es solo el comienzo! Tenemos la intención de implementar mecanismos para permitir a los usuarios compartir sus ideas de forma anónima y económicamente viable, ¡lo que permitirá a las comunidades agregarse en torno a mercados de ideas interesantes!

Los detalles de tus transacciones en la cadena nunca se exponen a terceros. Al brindarte información privada sobre tu propio comportamiento económico, estamos permitiendo que todos tomen decisiones financieras más saludables. Anticipamos diversas comunidades que se forman en torno a diferentes tipos de ideas, para colaborar en valores compartidos.

## Detalle Técnico del Almacenamiento en Caché de UA:

Zcash admite una Dirección Unificada multiprotocolo que permite que el protocolo se actualice a versiones más nuevas sin romper la compatibilidad con versiones anteriores. Este sistema de Direcciones Unificadas es implementado por los clientes fuera de la cadena. Los clientes comparten Direcciones Unificadas entre sí, las Direcciones Unificadas contienen Direcciones Específicas de la Versión del Protocolo que el cliente puede desempaquetar y publicar en la cadena de bloques como parte de la transacción que crea. Esto significa que la dirección en la cadena asociada con una transacción no contiene toda la información que el Cliente Remitente recibió como una "Dirección Unificada" del Cliente Receptor, fuera de la cadena. Si el Cliente Remitente simplemente registrara la UA fuera de la cadena, en el caso de volver a generar el Cliente a partir de su Frase Semilla, no habría forma de recuperar esos datos de relación. Zingo resuelve este problema registrando la UA original proporcionada por el destinatario en el campo de memo del cambio de la transacción.
