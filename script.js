// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBc8F4JboBog3aXjNtL4l9UUk_IiQmkzss",
    authDomain: "formulariodb-55df0.firebaseapp.com",
    projectId: "formulariodb-55df0",
    storageBucket: "formulariodb-55df0.firebasestorage.app",
    messagingSenderId: "174628229564",
    appId: "1:174628229564:web:eb88b5396bd502d5aa9bb9",
    measurementId: "G-63S241WSWG"
  };
  
  // Inicializar Firebase
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  
  // Variables globales
  let contadorRegistros = 0;
  let editId = null;
  
  // Referencias a elementos del DOM
  const crudForm = document.getElementById('crudForm');
  const tablaDatos = document.getElementById('tablaDatos').getElementsByTagName('tbody')[0];
  
  // Función para generar nuevo ID (001, 002, etc.)
  function generarNuevoId() {
    contadorRegistros++;
    const nuevoId = contadorRegistros.toString().padStart(3, '0');
    localStorage.setItem('ultimoId', contadorRegistros.toString());
    return nuevoId;
  }
  
  // Cargar datos al iniciar
  document.addEventListener('DOMContentLoaded', async () => {
    await inicializarContador();
    await cargarDatos();
  });
  
  // Función para inicializar el contador de registros
  async function inicializarContador() {
    try {
      // Cargar desde localStorage si existe
      const ultimoIdGuardado = localStorage.getItem('ultimoId');
      if (ultimoIdGuardado) {
        contadorRegistros = parseInt(ultimoIdGuardado);
      }
  
      const snapshot = await db.collection('registros').get();
      if (!snapshot.empty) {
        const idsNumericos = snapshot.docs
          .map(doc => {
            const id = doc.id;
            return /^\d+$/.test(id) ? parseInt(id) : 0;
          })
          .filter(id => id > 0);
  
        const maxIdExistente = idsNumericos.length > 0 ? Math.max(...idsNumericos) : 0;
        contadorRegistros = Math.max(contadorRegistros, maxIdExistente);
      }
    } catch (error) {
      console.error("Error inicializando contador:", error);
    }
  }
  
  // Función para verificar duplicados
  async function existeRegistro(email, telefono, idExcluir = null) {
    const emailNormalizado = email.toLowerCase().trim();
    const telefonoNormalizado = telefono ? telefono.replace(/[^\d]/g, '') : null;
  
    const queryEmail = db.collection('registros')
      .where('emailNormalizado', '==', emailNormalizado)
      .limit(1);
  
    const queryTelefono = telefonoNormalizado ? 
      db.collection('registros')
        .where('telefonoNormalizado', '==', telefonoNormalizado)
        .limit(1) : null;
  
    try {
      const [emailSnapshot, telefonoSnapshot] = await Promise.all([
        queryEmail.get(),
        queryTelefono ? queryTelefono.get() : Promise.resolve(null)
      ]);
  
      const emailExiste = !emailSnapshot.empty && 
        (idExcluir === null || emailSnapshot.docs[0].id !== idExcluir);
      
      const telefonoExiste = telefonoNormalizado && !telefonoSnapshot.empty && 
        (idExcluir === null || telefonoSnapshot.docs[0].id !== idExcluir);
  
      return {
        emailExiste,
        telefonoExiste,
        mensaje: emailExiste ? 'El correo electrónico ya está registrado' : 
               telefonoExiste ? 'El número de teléfono ya está registrado' : ''
      };
    } catch (error) {
      console.error("Error verificando duplicados: ", error);
      return { emailExiste: false, telefonoExiste: false, mensaje: '' };
    }
  }
  
  // Función para cargar datos desde Firestore
  async function cargarDatos() {
    try {
      const querySnapshot = await db.collection('registros').orderBy('nombre').get();
      tablaDatos.innerHTML = '';
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${doc.id}</td>
          <td>${data.nombre}</td>
          <td>${data.email}</td>
          <td>${data.telefono || ''}</td>
          <td>
            <button class="btn-edit" onclick="editar('${doc.id}')">Editar</button>
            <button class="btn-delete" onclick="eliminar('${doc.id}')">Eliminar</button>
          </td>
        `;
        tablaDatos.appendChild(tr);
      });
    } catch (error) {
      console.error("Error cargando datos: ", error);
      alert("Error al cargar los datos");
    }
  }
  
  // Función para guardar (crear o actualizar registro)
  async function guardar() {
    const id = document.getElementById('recordId').value;
    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    
    if (!nombre || !email) {
      alert("Nombre y Email son campos obligatorios");
      return;
    }
  
    const { emailExiste, telefonoExiste, mensaje } = await existeRegistro(email, telefono, id);
    if (emailExiste || telefonoExiste) {
      alert(mensaje);
      return;
    }
  
    const datos = { 
      nombre, 
      email,
      emailNormalizado: email.toLowerCase().trim(),
      ...(telefono && { 
        telefono,
        telefonoNormalizado: telefono.replace(/[^\d]/g, '')
      })
    };
    
    try {
      if (id) {
        await db.collection('registros').doc(id).update(datos);
        alert("Registro actualizado correctamente");
      } else {
        const nuevoId = generarNuevoId();
        await db.collection('registros').doc(nuevoId).set(datos);
        alert(`Registro creado con ID: ${nuevoId}`);
      }
      
      await cargarDatos();
      limpiar();
    } catch (error) {
      console.error("Error guardando datos: ", error);
      alert("Error al guardar los datos: " + error.message);
    }
  }
  
  // Función para editar registro
  async function editar(id) {
    try {
      const doc = await db.collection('registros').doc(id).get();
      if (doc.exists) {
        const data = doc.data();
        document.getElementById('recordId').value = doc.id;
        document.getElementById('nombre').value = data.nombre;
        document.getElementById('email').value = data.email;
        document.getElementById('telefono').value = data.telefono || '';
        editId = id;
        
        document.getElementById('crudForm').scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error("Error editando registro: ", error);
      alert("Error al cargar el registro para editar");
    }
  }
  
  // Función para eliminar registro
  async function eliminar(id) {
    if (confirm('¿Estás seguro de eliminar este registro?')) {
      try {
        await db.collection('registros').doc(id).delete();
        await cargarDatos();
        
        if (editId === id) {
          limpiar();
        }
      } catch (error) {
        console.error("Error eliminando registro: ", error);
        alert("Error al eliminar el registro");
      }
    }
  }
  
  // Función para limpiar el formulario
  function limpiar() {
    crudForm.reset();
    document.getElementById('recordId').value = '';
    editId = null;
  }
  
  // Hacer funciones accesibles desde HTML
  window.guardar = guardar;
  window.editar = editar;
  window.eliminar = eliminar;
  window.limpiar = limpiar;