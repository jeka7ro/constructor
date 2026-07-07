import axios from 'axios';

async function fetchCatalog() {
    try {
        const res = await axios.get('http://127.0.0.1:8000/api/admin/catalog', {
            // we probably need a token. We can query the DB directly to see what /admin/catalog returns.
        });
        console.log(res.data);
    } catch(e) { console.error(e.response?.status); }
}

fetchCatalog();
