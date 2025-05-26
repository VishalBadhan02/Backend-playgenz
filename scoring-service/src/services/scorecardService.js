const { ScoreCardModel } = require("../models/socreCard");



class ScoreService {
    constructor() { }

    // Get the last message in a conversation
    async setScorecard(scoreData) {
        try {
            const noti = new ScoreCardModel({
                ...scoreData
            })
            await noti.save()
            if (!noti) {
                return false
            }
            return noti
        } catch (error) {
            throw error;
        }
    }


    async getScorecard(query) {
        try {
            const modal = await ScoreCardModel.findOne(query)
            if (!modal) {
                return "no modal found"
            }
            return modal
        } catch (error) {
            throw error;
        }
    }

    async updateScorecard(query) {
        try {
            const modal = await ScoreCardModel.findOneAndUpdate(query)
            if (!modal) {
                return "no modal found"
            }
            return modal
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new ScoreService();
