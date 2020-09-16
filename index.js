const puppeteer = require("puppeteer"); // importe o pacote puppeteer
const createCsvWriter = require("csv-writer").createObjectCsvWriter; //importe o pacote csv-writer


let scrape = async () => { // crie uma função assíncrona que irá realizar o scraping
    const browser = await puppeteer.launch({
        headless: true,   
    }); // cria um browser. A propriedade headless define se o browser irá abrir com interface gráfica ou se apenas irá executar em segundo plano, sem GUI. false = irá abrir interface gráfica; true = não irá abrir interface gráfica

  const page = await browser.newPage(); // cria uma nova aba no navegador acima

 await page.setViewport({
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
  });


  await page.goto("http://www2.decom.ufop.br/terralab/posts/?category=all"); // define a página que queremos acessar e a função goto navega até essa página
  

  let haveNext = false; // flag para decidir se existe uma próxima página ou não
  let links = []; // vetor onde armazenaremos  todos os links coletados

  do {
    haveNext = false; // a flag vai para falso sempre ao entrar no loop
    const urls = await page.$$eval("article > div > a", (el) => {
      return el.map((a) => a.getAttribute("href"));
    }); // fazemos a chechagem pelas urls dessa página normalmente 

    links = links.concat(urls); //concatenamos o resultado dessa página com o das páginas anteriores 

    // a linha abaixo utiliza o seletor da seta >> para o elemento com a função $
    const button_next_page = await page.$("ul.page-numbers > li > a.next.page-numbers"); 

    //se o elemento existir (for !== null)
    if (button_next_page) {
      //aguarda pelo término da execução das duas coisas abaixo antes de prosseguir
      await Promise.all(
        [
          page.waitForNavigation(),  //espera que a navegação entre as páginas tenha terminado
          page.$eval("ul.page-numbers > li > a.next.page-numbers", e => e.click()) //encontra a seta >> com com $eval e clica no elemento
        ]
      );
      haveNext = true; // caso tenha encontrado a seta >>, a flag vira true e o código do loop é executado novamente
    }
  } while (haveNext);

  const posts = [];
  //for para caminhar em cada uma das URLS
  for (const url of links) {
    await page.goto(url); // caminha para a URL 
    await page.waitForSelector("div.entry-content > div"); //espera até que o texto esteja disponível para ser selecionado

    const title = await page.$eval("div.header-callout > section > div > div > div > h3", (title) => title.innerText);
    const image = await page.$eval("header > a > img", (image) =>
      image.getAttribute("src")
    );

    const content = await page.$eval("div.entry-content > div", el => el.innerText);

    const post = {
      title, 
      image, 
      content
    };

    posts.push(post);

  }

  browser.close(); // fecha o browser, indicando que finalizamos o scraping

  return posts; // no momento, não desejamos retornar nada. Por isso, return []
};
 
 
//chamada da função scrape. O then/catch é para esperar que a promisse se resolva e para que possamos tratar eventuais erros. 
scrape()
  .then((value) => {
    // cria o arquivo e adiciona um HEADER com os titulos das colunas e atribui a constante csvWriter
    const csvWriter = createCsvWriter({
      path: "file.csv",
      header: [
        { id: "title", title: "Titulo" },
        { id: "image", title: "Imagem" },
        { id: "content", title: "Conteudo" },
      ],
    });
    // salva no arquivo acima os valores recebidos do scraper
    csvWriter
      .writeRecords(value) // retorna uma promise
      .then(() => {
        console.log("...Feito");
      });
  })
  .catch((error) => console.log(error));