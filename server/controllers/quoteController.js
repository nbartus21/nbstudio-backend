// quoteController.js fájlba helyezd el
export const getQuotesAnalytics = async (req, res) => {
    try {
      const quotes = await Quote.find();
      
      // Statisztikák számítása
      const totalQuotes = quotes.length;
      const activeQuotes = quotes.filter(q => q.status === 'elküldve').length;
      const acceptedQuotes = quotes.filter(q => q.status === 'elfogadva').length;
      const rejectedQuotes = quotes.filter(q => q.status === 'elutasítva').length;
      const expiredQuotes = quotes.filter(q => q.status === 'lejárt').length;
      
      // Összegek számítása
      const totalAmount = quotes
        .filter(q => q.status === 'elküldve')
        .reduce((sum, q) => sum + q.totalAmount, 0);
        
      const acceptedAmount = quotes
        .filter(q => q.status === 'elfogadva')
        .reduce((sum, q) => sum + q.totalAmount, 0);
      
      // Konverziós ráta számítása
      const conversionRate = totalQuotes > 0 
        ? Math.round((acceptedQuotes / totalQuotes) * 100 * 10) / 10 
        : 0;
      
      // Hamarosan lejáró árajánlatok listája (7 napon belül)
      const now = new Date();
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      
      const expiringQuotes = quotes
        .filter(q => 
          q.status === 'elküldve' && 
          q.validUntil >= now && 
          q.validUntil <= sevenDaysLater
        )
        .map(q => ({
          _id: q._id,
          quoteNumber: q.quoteNumber,
          client: { name: q.client.name },
          totalAmount: q.totalAmount,
          validUntil: q.validUntil
        }));
      
      // Havi statisztikák generálása
      const monthlyStats = generateMonthlyStats(quotes);
  
      // Státusz eloszlás
      const statusDistribution = [
        { name: 'Elküldve', value: activeQuotes },
        { name: 'Elfogadva', value: acceptedQuotes },
        { name: 'Elutasítva', value: rejectedQuotes },
        { name: 'Lejárt', value: expiredQuotes }
      ];
      
      res.json({
        totalQuotes,
        activeQuotes,
        acceptedQuotes,
        rejectedQuotes,
        expiredQuotes,
        totalAmount,
        acceptedAmount,
        conversionRate,
        expiringQuotes,
        monthlyStats,
        statusDistribution
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ message: 'Error fetching analytics' });
    }
  };
  
  // Segédfüggvény a havi statisztikákhoz
  function generateMonthlyStats(quotes) {
    const monthNames = ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Szep', 'Okt', 'Nov', 'Dec'];
    const monthlyStats = [];
    
    // Havi statisztikák inicializálása
    for (let i = 0; i < 12; i++) {
      monthlyStats.push({
        month: monthNames[i],
        quotes: 0,
        accepted: 0,
        amount: 0
      });
    }
    
    // Statisztikák számítása havonként
    quotes.forEach(quote => {
      const createdDate = new Date(quote.createdAt);
      const month = createdDate.getMonth();
      
      monthlyStats[month].quotes++;
      
      if (quote.status === 'elfogadva') {
        monthlyStats[month].accepted++;
        monthlyStats[month].amount += quote.totalAmount;
      }
    });
    
    return monthlyStats;
  }