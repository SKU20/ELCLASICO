import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-section about">
        <h3>ჩვენს შესახებ - El Clasico</h3>
        <p>
          El Clasico არის პრემიუმ კლასის საფეხბურთო ბუცების მაღაზია ქუთაისში.
          გთავაზობთ მაღალი ხარისხის ბუცებს ყველა დონის მოთამაშისთვის. 
          მობრძანდით ადგილზე ან დაგვიკავშირდით თქვენთვის სასურველი მეთოდით.
        </p>
      </div>

      <div className="footer-section contact">
        <h3>დაგვიკავშირდით</h3>
        <ul>
          <li><strong>ტელეფონი:</strong> +995 555 12 34 56</li>
          <li><strong>ელ. ფოსტა:</strong> elclasico.georgia@gmail.com</li>
          <li><strong>WhatsApp და Viber:</strong> +995 555 12 34 56</li>
        </ul>
      </div>

      <div className="footer-section locations">
        <h3>ფილიალები</h3>
        <ul>
          <li>
            <strong>მთავარი ფილიალი:</strong> ქუთაისის ცენტრალური ბაზრის მიმდებარე ტერიტორია, წერეთლის ქუჩა. 
            დიდი აფთიაქის მოპირდაპირედ, Adidas-ის მაღაზიის გვერდით.
          </li>
          <li>
            <strong>მეორე ფილიალი:</strong> ბაგრატის დასახლება, ახალი საფეხბურთო მოედნის მახლობლად, 
            ბაგრატის მინი მარკეტის უკან. პარკინგი ხელმისაწვდომია.
          </li>
        </ul>
      </div>

      <div className="footer-section map">
        <h3>იპოვე ჩვენი ადგილი რუკაზე</h3>
        <iframe
          title="El Clasico რუკა"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d11912.38140221998!2d42.7059323!3d42.2657988!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x405c8c55b56ff59d%3A0x6d3aa8de5d7e61c4!2sKutaisi%2C%20Georgia!5e0!3m2!1sen!2sge!4v1697536500000!5m2!1sen!2sge"
          width="100%"
          height="200"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
        ></iframe>
      </div>
    </footer>
  );
};

export default Footer;
