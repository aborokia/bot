require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// قاعدة بيانات بسيطة في الذاكرة (يفضل استخدام Quick.db أو MongoDB للمتجر الحقيقي)
const balances = new Map();

client.on('ready', () => {
    console.log(`✅ تم تشغيل البوت بنجاح باسم: ${client.user.tag}`);
    client.user.setActivity('إدارة المبيعات والتذاكر 🛒');
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const args = message.content.split(' ');
    const command = args[0];

    // أمر عرض الرصيد
    if (command === '!balance' || command === '!رصيد') {
        const balance = balances.get(message.author.id) || 0;
        const embed = new EmbedBuilder()
            .setTitle('💳 محفظة العميل')
            .setDescription(`رصيدك الحالي هو: **$${balance}**`)
            .setColor('Green');
        return message.reply({ embeds: [embed] });
    }

    // أمر إضافة رصيد (للإدارة فقط)
    if (command === '!add-balance' || command === '!شحن') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ هذا الأمر للمسؤولين فقط.');
        }
        const target = message.mentions.users.first();
        const amount = parseInt(args[2]);

        if (!target || isNaN(amount)) {
            return message.reply('⚠️ الاستخدام الصحيح: `!شحن @العميل المبلغ`');
        }

        const currentBalance = balances.get(target.id) || 0;
        balances.set(target.id, currentBalance + amount);

        return message.reply(`✅ تم إضافة **$${amount}** لرصيد ${target.username}. الرصيد الجديد: **$${currentBalance + amount}**`);
    }

    // أمر إنشاء لوحة التذاكر
    if (command === '!setup-tickets' || command === '!لوحة-التذاكر') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        const embed = new EmbedBuilder()
            .setTitle('🛒 الدعم الفني والشراء')
            .setDescription('اضغط على الزر أدناه لفتح تكت شراء أو استفسار.')
            .setColor('Blue');

        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('open_ticket')
                .setLabel('📩 فتح تكت')
                .setStyle(ButtonStyle.Primary)
        );

        return message.channel.send({ embeds: [embed], components: [button] });
    }
});

// التفاعل مع الأزرار (فتح وإغلاق التذاكر)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'open_ticket') {
        const channelName = `ticket-${interaction.user.username}`;
        
        // التحقق مما إذا كان لديه تكت مفتوح بالفعل
        const existingChannel = interaction.guild.channels.cache.find(c => c.name === channelName.toLowerCase());
        if (existingChannel) {
            return interaction.reply({ content: `⚠️ لديك تكت مفتوح بالفعل: ${existingChannel}`, ephemeral: true });
        }

        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                },
            ],
        });

        const closeButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('🔒 إغلاق التكت')
                .setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({
            content: `مرحباً ${interaction.user}، كيف يمكننا مساعدتك اليوم؟`,
            components: [closeButton]
        });

        await interaction.reply({ content: `✅ تم إنشاء التكت: ${ticketChannel}`, ephemeral: true });
    }

    if (interaction.customId === 'close_ticket') {
        await interaction.reply('🔒 سيتم إغلاق التكت خلال 5 ثوانٍ...');
        setTimeout(() => interaction.channel.delete(), 5000);
    }
});

client.login(process.env.DISCORD_TOKEN);